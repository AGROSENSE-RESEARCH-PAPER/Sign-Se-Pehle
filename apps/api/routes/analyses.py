"""PRD API: POST /v1/analyses, GET status, GET report, GET report.pdf,
DELETE analysis. MVP runs the pipeline synchronously and stores
results in memory only; delete removes them. No document text is
logged, and nothing is persisted to disk."""
import uuid

from fastapi import APIRouter, File, Form, HTTPException, UploadFile
from fastapi.responses import Response

from llm.extractor_llm import extract_terms_llm
from pipeline.extractor import extract_terms
from pipeline.intake import extract_text
from pipeline.ocr import ocr_available, ocr_image_bytes, ocr_pdf_bytes
from pipeline.quote_guard import verify
from pipeline.report import build_report
from pipeline.rules import run_rules
from pipeline.splitter import split_clauses

router = APIRouter()
STORE = {}


def _pdf_bytes(report, language):
    """Minimal one-page PDF (English text; Hindi PDF is a later step —
    standard PDF fonts do not render Devanagari)."""
    lines = [
        "Sign Se Pehle — Report",
        f"Verdict: {report['verdict'].upper()}",
        report.get("summary_en") or "Ask questions before you sign.",
        "",
    ]
    for c in report["top_cards"]:
        lines.append(f"- {c['title_en']}")
        if c.get("quote"):
            lines.append(f"  Quote: {c['quote']}")
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
    file: UploadFile = File(...),
    state: str = Form("baseline"),
    language: str = Form("en"),
):
    data = await file.read()
    if len(data) > 20 * 1024 * 1024:
        raise HTTPException(status_code=413, detail="File over 20 MB")
    fname = file.filename or ""
    text = extract_text(fname, data)
    ocr_used = False
    pages_to_retake = []
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
    report = build_report(findings, language if language in ("en", "hi") else "en")
    report["extraction_method"] = method
    report["ocr_used"] = ocr_used
    report["pages_to_retake"] = pages_to_retake
    aid = uuid.uuid4().hex
    STORE[aid] = {
        "id": aid,
        "status": "ready",
        "step": "ready",
        "state": state,
        "language": language,
        "report": report,
        "terms": terms,
        "pages_to_retake": pages_to_retake,
    }
    return {"id": aid, "status": "queued"}


@router.get("/v1/analyses/{aid}")
async def get_analysis(aid: str):
    item = STORE.get(aid)
    if not item:
        raise HTTPException(status_code=404, detail="Analysis not found")
    return {
        "id": aid,
        "status": item["status"],
        "step": item["step"],
        "pages_to_retake": item.get("pages_to_retake", []),
    }


@router.get("/v1/analyses/{aid}/report")
async def get_report(aid: str):
    item = STORE.get(aid)
    if not item:
        raise HTTPException(status_code=404, detail="Analysis not found")
    return item["report"]


@router.get("/v1/analyses/{aid}/report.pdf")
async def get_report_pdf(aid: str):
    item = STORE.get(aid)
    if not item:
        raise HTTPException(status_code=404, detail="Analysis not found")
    return Response(
        content=_pdf_bytes(item["report"], item["language"]),
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename=sign-se-pehle-{aid}.pdf"},
    )


@router.delete("/v1/analyses/{aid}", status_code=204)
async def delete_analysis(aid: str):
    if aid not in STORE:
        raise HTTPException(status_code=404, detail="Analysis not found")
    del STORE[aid]
    return Response(status_code=204)
