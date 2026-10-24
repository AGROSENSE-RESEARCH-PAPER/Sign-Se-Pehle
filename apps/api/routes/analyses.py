"""PRD API: POST /v1/analyses, GET status, GET report, GET report.pdf,
DELETE analysis. MVP runs the pipeline synchronously and stores
results in memory only; delete removes them. No document text is
logged, and nothing is persisted to disk.

Track 3 (Final PRD compliance):
- Coverage-aware verdict: see pipeline/coverage.py and
  pipeline/report.py. Verdicts are incomplete / red / amber /
  limited_clear — never "green", never "safe".
- Capability token: POST returns a random session_token. Every later
  route requires it (Authorization: Bearer <token> or X-Session-Token
  header). Only a SHA-256 hash of the token is stored, never the raw
  token. A missing/wrong token and an unknown id return the SAME
  404, so a caller cannot probe whether another session exists.
  Consequence, stated plainly: the old ID-only path BREAKS. Any
  client (including the web frontend) must store the session_token
  from POST and send it on every later call.
- Retention: each analysis expires 1 hour after creation
  (RETENTION_SECONDS). Expired analyses are purged on access and by
  sweep_expired(), which a future worker can call on a schedule; the
  demo has no background scheduler, so access-time purging is what
  makes expiry real. DELETE removes the record immediately and its
  report becomes unretrievable.
- Unsupported state: only "baseline", "uk" and "uttarakhand" are
  accepted, and all three run the same shipped baseline rule set.
  Any other state returns an INCOMPLETE report without running the
  pipeline at all (the document is not sent to the LLM). Accepting
  "uk" does NOT mean verified Uttarakhand rules ran — that registry
  is still a candidate backlog (enabled=0) — so the report labels
  its rule_set as "baseline-v1".
"""
import hashlib
import hmac
import secrets
import time
import uuid

from fastapi import APIRouter, File, Form, Header, HTTPException, UploadFile
from fastapi.responses import Response

from llm.extractor_llm import extract_terms_llm
from pipeline.coverage import compute_coverage
from pipeline.extractor import extract_terms
from pipeline.intake import extract_text
from pipeline.ocr import ocr_available, ocr_image_bytes, ocr_pdf_bytes
from pipeline.quote_guard import verify
from pipeline.report import build_report
from pipeline.rules import run_rules
from pipeline.splitter import split_clauses

router = APIRouter()
STORE = {}

RETENTION_SECONDS = 3600  # Final PRD: expiry no more than 1 hour.
# "uk"/"uttarakhand" are accepted for the v1 demo flow (Track 1 frontend
# only lets Uttarakhand through), but the checks that actually run are
# the baseline rule set — the Uttarakhand registry (rules/uttarakhand.json)
# is still a CANDIDATE backlog with enabled=0, not legally verified, so
# accepting "uk" must NOT be read as "verified Uttarakhand rules ran".
# The report labels its rule set as baseline to keep that honest.
SUPPORTED_STATES = {"baseline", "uk", "uttarakhand"}


def _hash_token(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def sweep_expired(now=None):
    """Remove every expired analysis. Returns how many were removed."""
    now = time.time() if now is None else now
    expired = [aid for aid, item in STORE.items()
               if item["expires_at"] <= now]
    for aid in expired:
        del STORE[aid]
    return len(expired)


def _require_item(aid: str, authorization: str | None,
                  x_session_token: str | None):
    """Fetch a live, authorised analysis or raise an indistinguishable
    404. Token comes from `Authorization: Bearer <token>` or the
    `X-Session-Token` header; either is accepted, neither is logged."""
    sweep_expired()
    item = STORE.get(aid)
    token = None
    if authorization and authorization.lower().startswith("bearer "):
        token = authorization[7:].strip()
    elif x_session_token:
        token = x_session_token.strip()
    if (
        item is None
        or not token
        or not hmac.compare_digest(_hash_token(token), item["token_hash"])
    ):
        raise HTTPException(status_code=404, detail="Analysis not found")
    return item


def _store(aid, state, language, report, terms, pages_to_retake):
    now = time.time()
    STORE[aid] = {
        "id": aid,
        "status": "ready",
        "step": "ready",
        "state": state,
        "language": language,
        "report": report,
        "terms": terms,
        "pages_to_retake": pages_to_retake,
        "token_hash": None,  # filled in by the caller, which holds the token
        "created_at": now,
        "expires_at": now + RETENTION_SECONDS,
    }
    return STORE[aid]


def _pdf_bytes(report, language):
    """Minimal one-page PDF (English text; Hindi PDF is a later step —
    standard PDF fonts do not render Devanagari)."""
    cov = report.get("coverage") or {}
    lines = [
        "Sign Se Pehle — Report",
        f"Verdict: {report['verdict'].upper()}",
        f"Coverage: {cov.get('checked', '?')} of {cov.get('eligible', '?')} checks completed",
        report.get("summary_en") or "Ask questions before you sign.",
        "",
    ]
    for c in report["top_cards"]:
        lines.append(f"- {c['title_en']}")
        if c.get("quote"):
            lines.append(f"  Quote: {c['quote']}")
        if c.get("provision"):
            lines.append(f"  Legal basis: {c['provision']} (unverified — check official text)")
        if c.get("uk_rule_id"):
            lines.append(f"  Uttarakhand candidate: {c['uk_rule_id']} ({c.get('uk_relation')}) — not legally verified")
        lines.append(f"  Ask: {c['ask_en']}")
    lines.append("")
    lines.append("This is a checklist, not legal advice. Ask a lawyer before you sign.")
    esc = lambda s: s.replace("\\", "\\\\").replace("(", "\\(").replace(")", "\\)")
    stream = "BT /F1 11 Tf 50 780 Td 14 TL\n"
    for ln in lines:
        stream += f"({esc(ln)}) Tj T*\n"
    stream += "ET"
    body = stream.encode("latin-1", errors="ignore")
    objs = []
    objs.append(b"<< /Type /Catalog /Pages 2 0 R >>")
    objs.append(b"<< /Type /Pages /Kids [3 0 R] /Count 1 >>")
    objs.append(
        b"<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] "
        b"/Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>"
    )
    objs.append(b"<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>")
    objs.append(b"<< /Length %d >>\nstream\n" % len(body) + body + b"\nendstream")
    out = bytearray(b"%PDF-1.4\n")
    offsets = []
    for i, o in enumerate(objs, start=1):
        offsets.append(len(out))
        out += f"{i} 0 obj\n".encode() + o + b"\nendobj\n"
    xref = len(out)
    out += f"xref\n0 {len(objs)+1}\n0000000000 65535 f \n".encode()
    for off in offsets:
        out += f"{off:010d} 00000 n \n".encode()
    out += f"trailer\n<< /Size {len(objs)+1} /Root 1 0 R >>\nstartxref\n{xref}\n%%EOF".encode()
    return bytes(out)


@router.post("/v1/analyses")
async def create_analysis(
    file: UploadFile = File(None),
    files: list[UploadFile] = File(None),
    state: str = Form("baseline"),
    language: str = Form("en"),
):
    # Multi-photo upload (Final PRD F1/F3): up to 8 ordered photos.
    # `files` (repeated field) takes precedence; the legacy single
    # `file` field keeps old clients and tests working unchanged.
    uploads = list(files) if files else ([file] if file is not None else [])
    if not uploads:
        raise HTTPException(status_code=400, detail="No file uploaded")
    if len(uploads) > 8:
        raise HTTPException(status_code=400, detail="Up to 8 photos per analysis")
    language = language if language in ("en", "hi") else "en"
    state = (state or "baseline").strip().lower()
    aid = uuid.uuid4().hex
    token = secrets.token_urlsafe(32)
    if state not in SUPPORTED_STATES:
        # Unsupported state: no pipeline run, no LLM call, INCOMPLETE.
        # Rule ids are read from the rule set so this cannot drift.
        from pipeline.rules import load_rules

        all_ids = [r["id"] for r in load_rules()]
        coverage = {"checked": 0, "eligible": len(all_ids), "unreadable_pages": []}
        report = build_report(
            [], language, coverage=coverage,
            unchecked_rules=all_ids,
            unsupported_state=True,
        )
        item = _store(aid, state, language, report, {}, [])
        item["token_hash"] = _hash_token(token)
        return {"id": aid, "status": "ready", "session_token": token}

    ocr_used = False
    pages_to_retake = []
    if len(uploads) > 1:
        # Multi-photo path: photos are read IN ORDER (photo 1, 2, ...),
        # concatenated in that order, and pages_to_retake names the
        # photo numbers to retake (Final PRD: retake named pages only).
        for up in uploads:
            if not (up.filename or "").lower().endswith((".jpg", ".jpeg", ".png", ".webp")):
                raise HTTPException(
                    status_code=422,
                    detail="Multi-photo upload accepts photos only; upload a PDF as a single file.",
                )
        if not ocr_available():
            raise HTTPException(
                status_code=422,
                detail=(
                    "Could not read text from these photos and the OCR engine "
                    "(tesseract + Hindi/English data) is not installed on "
                    "this server. Install tesseract-ocr, tesseract-ocr-hin "
                    "and tesseract-ocr-eng, then retry."
                ),
            )
        ocr_used = True
        texts = []
        total = 0
        for i, up in enumerate(uploads, start=1):
            data_i = await up.read()
            total += len(data_i)
            if total > 20 * 1024 * 1024:
                raise HTTPException(status_code=413, detail="Files over 20 MB in total")
            text_i, conf = ocr_image_bytes(data_i)
            texts.append(text_i)
            if not text_i.strip() or conf < 50:
                pages_to_retake.append(i)
        text = "\n\n".join(texts)
        if not text.strip():
            raise HTTPException(
                status_code=422,
                detail="OCR could not read these photos. Please retake the weak pages and try again.",
            )
    else:
        data = await uploads[0].read()
        if len(data) > 20 * 1024 * 1024:
            raise HTTPException(status_code=413, detail="File over 20 MB")
        fname = uploads[0].filename or ""
        text = extract_text(fname, data)
        if not text.strip():
            # Scanned PDF or photo: OCR path (PRD F3).
            if not ocr_available():
                raise HTTPException(
                    status_code=422,
                    detail=(
                        "Could not read text from this file and the OCR engine "
                        "(tesseract + Hindi/English data) is not installed on "
                        "this server. Install tesseract-ocr, tesseract-ocr-hin "
                        "and tesseract-ocr-eng, then retry."
                    ),
                )
            ocr_used = True
            if fname.lower().endswith(".pdf"):
                text, pages_to_retake = ocr_pdf_bytes(data)
            else:
                text, conf = ocr_image_bytes(data)
                if not text.strip() or conf < 50:
                    pages_to_retake = [1]
            if not text.strip():
                raise HTTPException(
                    status_code=422,
                    detail="OCR could not read this file. Please retake the weak pages and try again.",
                )
    clauses = split_clauses(text)
    terms = extract_terms(clauses)
    method = "regex"
    llm_terms = extract_terms_llm(clauses)
    if llm_terms:
        # LLM terms win ONLY where their quote passes the guard;
        # otherwise the code-only term for that field stands.
        merged = dict(terms)
        used_llm = False
        for key, term in llm_terms.items():
            if term["value"] is not None and verify(term, clauses):
                merged[key] = term
                used_llm = True
        if used_llm:
            terms = merged
            method = "llm+regex"
    findings = run_rules(terms, clauses)
    coverage, unchecked = compute_coverage(terms, pages_to_retake)
    report = build_report(findings, language, coverage=coverage,
                          unchecked_rules=unchecked)
    # Honest labelling: baseline checks ran, not verified UK rules.
    report["rule_set"] = "baseline-v1"
    report["extraction_method"] = method
    report["ocr_used"] = ocr_used
    report["pages_to_retake"] = pages_to_retake
    item = _store(aid, state, language, report, terms, pages_to_retake)
    item["token_hash"] = _hash_token(token)
    return {"id": aid, "status": "ready", "session_token": token}


@router.get("/v1/analyses/{aid}")
async def get_analysis(aid: str, authorization: str | None = Header(None),
                       x_session_token: str | None = Header(None)):
    item = _require_item(aid, authorization, x_session_token)
    return {
        "id": aid,
        "status": item["status"],
        "step": item["step"],
        "pages_to_retake": item.get("pages_to_retake", []),
    }


@router.get("/v1/analyses/{aid}/report")
async def get_report(aid: str, authorization: str | None = Header(None),
                     x_session_token: str | None = Header(None)):
    item = _require_item(aid, authorization, x_session_token)
    return item["report"]


@router.get("/v1/analyses/{aid}/report.pdf")
async def get_report_pdf(aid: str, authorization: str | None = Header(None),
                         x_session_token: str | None = Header(None)):
    item = _require_item(aid, authorization, x_session_token)
    return Response(
        content=_pdf_bytes(item["report"], item["language"]),
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename=sign-se-pehle-{aid}.pdf"},
    )


@router.delete("/v1/analyses/{aid}", status_code=204)
async def delete_analysis(aid: str, authorization: str | None = Header(None),
                          x_session_token: str | None = Header(None)):
    # Authorisation first: a wrong-token DELETE must not delete, and
    # must be indistinguishable from an unknown id.
    _require_item(aid, authorization, x_session_token)
    del STORE[aid]
    return Response(status_code=204)
