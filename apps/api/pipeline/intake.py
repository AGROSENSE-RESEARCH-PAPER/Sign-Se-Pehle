"""Intake: file bytes -> plain text. PDF text layer first, OCR is a
later step (see PRD F3) — scanned/photo PDFs currently return their
text layer, or an empty string that the API reports as unreadable."""
import io


def extract_text(filename: str, data: bytes) -> str:
    name = (filename or "").lower()
    if name.endswith(".pdf"):
        try:
            from pypdf import PdfReader

            reader = PdfReader(io.BytesIO(data))
            parts = []
            for page in reader.pages:
                parts.append(page.extract_text() or "")
            return "\n".join(parts)
        except Exception:
            return ""
    if name.endswith((".jpg", ".jpeg", ".png", ".webp")):
        # Photos go through OCR in the caller, never through text decode.
        return ""
    # .txt fallback for the MVP demo path
    return data.decode("utf-8", errors="ignore")
