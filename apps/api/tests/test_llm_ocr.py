import os
import sys

import pytest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from llm.extractor_llm import _validate, extract_terms_llm
from pipeline.ocr import ocr_available

CLAUSES = [
    {"id": "C7", "text": "The Promoter shall be entitled to a grace period of eighteen (18) months beyond the possession date."},
]


def test_llm_terms_validated_and_bad_types_dropped():
    raw = {
        "grace_period_months": {"value": 18, "clause_id": "C7", "quote": "grace period of eighteen (18) months"},
        "buyer_late_interest_pct": {"value": "twenty-four", "clause_id": None, "quote": None},
        "arbitration_clause": {"value": False, "clause_id": None, "quote": None},
        "unknown_key": {"value": 1, "clause_id": "C1", "quote": "x"},
    }
    out = _validate(raw)
    assert out["grace_period_months"]["value"] == 18
    assert out["buyer_late_interest_pct"]["value"] is None
    assert out["arbitration_clause"]["value"] is None
    assert "unknown_key" not in out


def test_llm_extractor_uses_injected_call():
    def fake_call(prompt, text):
        assert "grace" in text.lower()
        return {
            "grace_period_months": {"value": 18, "clause_id": "C7", "quote": "grace period of eighteen (18) months"},
        }

    out = extract_terms_llm(CLAUSES, call=fake_call)
    assert out["grace_period_months"]["value"] == 18
    assert out["total_price_inr"]["value"] is None


def test_llm_extractor_returns_none_on_bad_json():
    def bad_call(prompt, text):
        raise ValueError("not json")

    assert extract_terms_llm(CLAUSES, call=bad_call) is None


@pytest.mark.skipif(not ocr_available(), reason="tesseract not installed here")
def test_ocr_reads_rendered_text():
    from PIL import Image, ImageDraw

    from pipeline.ocr import ocr_image_bytes
    import io

    img = Image.new("RGB", (600, 100), "white")
    ImageDraw.Draw(img).text((10, 30), "grace period of eighteen months", fill="black")
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    text, conf = ocr_image_bytes(buf.getvalue())
    assert "grace" in text.lower()
    assert conf >= 0


def test_ocr_available_is_bool():
    assert isinstance(ocr_available(), bool)
