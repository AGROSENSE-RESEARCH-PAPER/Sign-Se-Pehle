"""Items 6 + 7: legal basis on cards, and multi-photo upload (up to 8,
ordered). Run: pytest tests/ (from apps/api)."""
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

import routes.analyses as analyses_mod
from fastapi.testclient import TestClient
from main import app

SAMPLE = open(
    os.path.join(os.path.dirname(__file__), "..", "..", "..", "eval", "sample_agreement.txt"),
    encoding="utf-8",
).read()

# Two halves of the sample, as if photographed in two shots, in order.
HALF = len(SAMPLE) // 2
PART1, PART2 = SAMPLE[:HALF], SAMPLE[HALF:]


def _report(client, aid, token):
    r = client.get(f"/v1/analyses/{aid}/report",
                   headers={"Authorization": f"Bearer {token}"})
    assert r.status_code == 200, r.text
    return r.json()


def test_legal_basis_on_top_cards():
    c = TestClient(app)
    r = c.post("/v1/analyses",
               files={"file": ("sample.txt", SAMPLE.encode(), "text/plain")},
               data={"state": "UK", "language": "en"})
    assert r.status_code == 200, r.text
    rep = _report(c, r.json()["id"], r.json()["session_token"])
    assert rep["top_cards"], "sample must produce cards"
    for card in rep["top_cards"]:
        assert card["provision"], f"{card['rule_id']} must carry a provision"
        assert "unverified" in card["provision_status"]
    by_id = {card["rule_id"]: card for card in rep["top_cards"]}
    assert by_id["R-POSS-GRACE"]["uk_rule_id"] == "UK-POSS-04"
    assert by_id["R-INTEREST-UNEQUAL"]["uk_rule_id"] == "UK-INT-01"
    assert by_id["R-ARBITRATION"]["uk_rule_id"] == "UK-DISPUTE-15"
    assert by_id["R-POSS-GRACE"]["uk_status"] == "candidate — not legally verified"
    assert "RERA s.18" in by_id["R-POSS-GRACE"]["uk_provision_ref"]


def test_multiphoto_ordered_and_capped(monkeypatch):
    c = TestClient(app)
    # OCR is mocked per-photo, in call order, so order is observable:
    # part 1 carries the grace clause, part 2 the interest/arbitration.
    calls = []

    def fake_ocr(data):
        calls.append(data)
        return (PART1, 90) if len(calls) == 1 else (PART2, 90)

    monkeypatch.setattr(analyses_mod, "ocr_image_bytes", fake_ocr)
    r = c.post("/v1/analyses",
               files=[("files", ("p1.png", b"img1", "image/png")),
                      ("files", ("p2.png", b"img2", "image/png"))],
               data={"state": "UK", "language": "en"})
    assert r.status_code == 200, r.text
    assert calls == [b"img1", b"img2"], "photos must be OCR'd in upload order"
    rep = _report(c, r.json()["id"], r.json()["session_token"])
    assert rep["verdict"] == "red"
    assert rep["pages_to_retake"] == []
    # 9 photos -> rejected, not silently truncated.
    r9 = c.post("/v1/analyses",
                files=[("files", (f"p{i}.png", b"x", "image/png")) for i in range(9)],
                data={"state": "UK", "language": "en"})
    assert r9.status_code == 400
    # A PDF mixed into a photo set -> 422, not a silent skip.
    r_mix = c.post("/v1/analyses",
                   files=[("files", ("p1.png", b"x", "image/png")),
                          ("files", ("doc.pdf", b"%PDF", "application/pdf"))],
                   data={"state": "UK", "language": "en"})
    assert r_mix.status_code == 422


def test_multiphoto_weak_page_named(monkeypatch):
    c = TestClient(app)

    def fake_ocr(data):
        return (PART1, 90) if data == b"good" else ("", 20)

    monkeypatch.setattr(analyses_mod, "ocr_image_bytes", fake_ocr)
    r = c.post("/v1/analyses",
               files=[("files", ("p1.png", b"good", "image/png")),
                      ("files", ("p2.png", b"bad", "image/png"))],
               data={"state": "UK", "language": "en"})
    assert r.status_code == 200, r.text
    rep = _report(c, r.json()["id"], r.json()["session_token"])
    assert rep["pages_to_retake"] == [2]
    assert rep["verdict"] == "incomplete"
