"""OCR: images and scanned PDFs -> text, with per-page confidence.
Engine: Tesseract (free, local) with Hindi + English data. If the
tesseract binary or language data is missing, ocr_available() is
False and callers must report that clearly instead of failing silently.
Low-confidence pages (< 50 mean confidence, or empty) are returned
as pages_to_retake so the user can re-photograph just those pages
(PRD F3, and the reading screen's retake loop)."""
import io
import os
import shutil
import subprocess
import tempfile


def ocr_available() -> bool:
    if not shutil.which("tesseract"):
        return False
    try:
        import PIL  # noqa: F401
        import pytesseract  # noqa: F401
    except Exception:
        return False
    return True


def _ocr_image(image_bytes: bytes):
    from PIL import Image
    import pytesseract

    image = Image.open(io.BytesIO(image_bytes))
    if image.mode not in ("RGB", "L"):
        image = image.convert("RGB")
    try:
        data = pytesseract.image_to_data(
            image, lang="hin+eng", output_type=pytesseract.Output.DICT
        )
    except Exception:
        # Hindi data missing on this machine: English alone still helps.
        data = pytesseract.image_to_data(
            image, lang="eng", output_type=pytesseract.Output.DICT
        )
    words = []
    confs = []
    for text, conf in zip(data.get("text", []), data.get("conf", [])):
        if text and text.strip():
            words.append(text)
            try:
                c = float(conf)
                if c >= 0:
                    confs.append(c)
            except (TypeError, ValueError):
                pass
    mean_conf = sum(confs) / len(confs) if confs else 0.0
    return " ".join(words), mean_conf


def ocr_image_bytes(data: bytes):
    """-> (text, mean_confidence)"""
    return _ocr_image(data)


def ocr_pdf_bytes(data: bytes):
    """Render each PDF page with pdftoppm, OCR it. -> (text, pages_to_retake)."""
    pages_text = []
    retake = []
    with tempfile.TemporaryDirectory() as tmp:
        pdf_path = os.path.join(tmp, "in.pdf")
        with open(pdf_path, "wb") as f:
            f.write(data)
        subprocess.run(
            ["pdftoppm", "-png", "-r", "200", pdf_path, os.path.join(tmp, "p")],
            check=True,
            capture_output=True,
        )
        pages = sorted(
            p for p in os.listdir(tmp) if p.startswith("p-") and p.endswith(".png")
        )
        for i, name in enumerate(pages, start=1):
            with open(os.path.join(tmp, name), "rb") as f:
                text, conf = _ocr_image(f.read())
            pages_text.append(text)
            if not text.strip() or conf < 50:
                retake.append(i)
    return "\n\n".join(pages_text), retake
