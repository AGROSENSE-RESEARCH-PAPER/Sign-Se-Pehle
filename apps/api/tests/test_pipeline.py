import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from fastapi.testclient import TestClient
from main import app
from pipeline.quote_guard import verify

SAMPLE = open(
    os.path.join(os.path.dirname(__file__), "..", "..", "..", "eval", "sample_agreement.txt"),
    encoding="utf-8",
).read()


def test_quote_guard_accepts_verbatim_and_rejects_invented():
    clauses = [{"id": "C7", "text": "The Promoter shall be entitled to a grace period of eighteen (18) months."}]
    assert verify({"clause_id": "C7", "quote": "grace period of eighteen (18) months"}, clauses)
    assert not verify({"clause_id": "C7", "quote": "the builder must pay double"}, clauses)


def test_sample_agreement_end_to_end():
    c = TestClient(app)
    r = c.post(
        "/v1/analyses",
        files={"file": ("sample.txt", SAMPLE.encode(), "text/plain")},
        data={"state": "baseline", "language": "en"},
    )
    assert r.status_code == 200
    # Track 3: report requires the session_token returned by POST.
    created = r.json()
    rep = c.get(
        f"/v1/analyses/{created['id']}/report",
        headers={"Authorization": f"Bearer {created['session_token']}"},
    ).json()
    assert rep["verdict"] == "red"
    assert len(rep["top_cards"]) == 3
    # No quote, no flag: every top card carries a verbatim quote.
    assert all(card["quote"] for card in rep["top_cards"])
    assert any(card["rule_id"] == "R-POSS-GRACE" for card in rep["top_cards"])
