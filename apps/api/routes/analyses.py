"""PRD API: POST /v1/analyses, GET status, GET report, GET report.pdf,
DELETE analysis. MVP runs the pipeline synchronously and stores
results in memory only; delete removes them. No document text is
logged, and nothing is persisted to disk."""
import uuid

from fastapi import APIRouter, File, Form, HTTPException, UploadFile
from fastapi.responses import Response

from pipeline.extractor import extract_terms
from pipeline.intake import extract_text
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
    text = extract_text(file.filename or "", data)
    if not text.strip():
        raise HTTPException(
            status_code=422,
            detail="Could not read text from this file (scanned/photo OCR is a later step)",
        )
    clauses = split_clauses(text)
    terms = extract_terms(clauses)
    findings = run_rules(terms, clauses)
    report = build_report(findings, language if language in ("en", "hi") else "en")
    aid = uuid.uuid4().hex
    STORE[aid] = {
        "id": aid,
        "status": "ready",
        "step": "ready",
        "state": state,
        "language": language,
        "report": report,
        "terms": terms,
    }
    return {"id": aid, "status": "queued"}


@router.get("/v1/analyses/{aid}")
async def get_analysis(aid: str):
    item = STORE.get(aid)
    if not item:
        raise HTTPException(status_code=404, detail="Analysis not found")
    return {"id": aid, "status": item["status"], "step": item["step"]}


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
