"""Track 3 tests: coverage-aware verdict, capability token, 1h
retention, PII redaction before LLM. Run: pytest tests/ (from apps/api).
"""
import os
import sys
import time

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

import routes.analyses as analyses_mod
from fastapi.testclient import TestClient
from llm.extractor_llm import extract_terms_llm
from main import app
from pipeline.coverage import compute_coverage
from pipeline.quote_guard import verify
from pipeline.redact import redact_pii
from pipeline.report import build_report
from routes.analyses import STORE, sweep_expired

SAMPLE = open(
    os.path.join(os.path.dirname(__file__), "..", "..", "..", "eval", "sample_agreement.txt"),
    encoding="utf-8",
).read()

# Clean agreement: every evaluated input present, nothing triggers a
# finding. Paragraphs (not "Clause N:" headings) so the code extractor
# does not mistake a clause number for a rate.
CLEAN = """The carpet area of the apartment is 820 sq ft as per the approved plan.

The total price of the apartment is 7500000 rupees, payable in instalments.

The possession date is 30 June 2028. The Promoter shall be entitled to a grace period of zero (0) months beyond the possession date.

Interest at 10% per annum shall be payable by the Allottee on delayed payments. The Promoter shall pay interest at 10% per annum on delayed possession.
"""

FULL_TERMS = {
    "grace_period_months": {"value": 0.0},
    "buyer_late_interest_pct": {"value": 10.0},
    "builder_delay_interest_pct": {"value": 10.0},
    "arbitration_clause": {"value": None},
    "possession_date": {"value": "30 June 2028"},
    "total_price_inr": {"value": 7500000.0},
    "carpet_area_sqft": {"value": 820.0},
}


def _post(client, text, **data):
    r = client.post(
        "/v1/analyses",
        files={"file": ("doc.txt", text.encode(), "text/plain")},
        data=data,
    )
    assert r.status_code == 200, r.text
    return r.json()


def _report(client, aid, token):
    r = client.get(f"/v1/analyses/{aid}/report",
                   headers={"Authorization": f"Bearer {token}"})
    assert r.status_code == 200, r.text
    return r.json()


# --- Verdict / coverage ---

def test_sample_still_red_with_full_coverage():
    c = TestClient(app)
    created = _post(c, SAMPLE, state="baseline", language="en")
    assert created["session_token"]
    rep = _report(c, created["id"], created["session_token"])
    assert rep["verdict"] == "red"
    assert rep["coverage"] == {"checked": 8, "eligible": 8, "unreadable_pages": []}
    assert rep["unchecked_rules"] == []
    assert all(card["quote"] for card in rep["top_cards"])


def test_clean_full_coverage_is_limited_clear_not_green():
    c = TestClient(app)
    created = _post(c, CLEAN, state="baseline", language="en")
    rep = _report(c, created["id"], created["session_token"])
    assert rep["verdict"] == "limited_clear"
    assert rep["verdict"] != "green"
    assert rep["top_cards"] == []
    assert rep["coverage"]["checked"] == rep["coverage"]["eligible"] == 8
    assert "safe" not in (rep["summary_en"] or "").lower()


def test_incomplete_on_unreadable_pages_via_ocr(monkeypatch):
    c = TestClient(app)
    monkeypatch.setattr(analyses_mod, "ocr_available", lambda: True)
    monkeypatch.setattr(analyses_mod, "ocr_image_bytes",
                        lambda data: (CLEAN, 40))  # low confidence
    r = c.post("/v1/analyses",
               files={"file": ("photo.png", b"fakebytes", "image/png")},
               data={"state": "baseline", "language": "en"})
    assert r.status_code == 200, r.text
    rep = _report(c, r.json()["id"], r.json()["session_token"])
    assert rep["verdict"] == "incomplete"
    assert rep["coverage"]["unreadable_pages"] == [1]
    assert rep["coverage"]["checked"] < rep["coverage"]["eligible"]


def test_incomplete_on_unsupported_state_and_no_pipeline_run():
    c = TestClient(app)
    created = _post(c, SAMPLE, state="delhi", language="en")
    rep = _report(c, created["id"], created["session_token"])
    assert rep["verdict"] == "incomplete"
    assert rep["coverage"] == {"checked": 0, "eligible": 8, "unreadable_pages": []}
    assert rep["top_cards"] == []
    assert len(rep["unchecked_rules"]) == 8


def test_coverage_counts_and_red_does_not_mask_incomplete():
    cov, unchecked = compute_coverage(FULL_TERMS, [])
    assert (cov["checked"], cov["eligible"]) == (8, 8)
    assert unchecked == []
    partial = dict(FULL_TERMS)
    partial["grace_period_months"] = {"value": None}
    cov, unchecked = compute_coverage(partial, [])
    assert cov["checked"] == 6  # grace + grace-zero unevaluated
    assert "R-POSS-GRACE" in unchecked and "R-GRACE-ZERO-OK" in unchecked
    cov, _ = compute_coverage(FULL_TERMS, [2])
    assert cov["checked"] < cov["eligible"]
    # A verified red finding on a partial-coverage report still reports
    # INCOMPLETE (verified cards are shown, all-clear language is not).
    rep = build_report(
        [{"rule_id": "R-POSS-GRACE", "severity": "red", "title_en": "t",
         "title_hi": "t", "ask_en": "a", "ask_hi": "a", "quote": "q",
         "clause_id": "C7"}],
        "en", coverage={"checked": 6, "eligible": 8, "unreadable_pages": []},
        unchecked_rules=["R-POSS-GRACE"],
    )
    assert rep["verdict"] == "incomplete"
    assert len(rep["top_cards"]) == 1


def test_no_unquoted_finding_surfaces():
    # A document with a missing price and nothing else quotable must
    # not produce a "price missing" card: missing data is a coverage
    # gap, not a finding.
    c = TestClient(app)
    created = _post(c, "The possession date is 30 June 2028.", state="baseline")
    rep = _report(c, created["id"], created["session_token"])
    assert rep["verdict"] == "incomplete"
    assert all(card["quote"] for card in rep["top_cards"])
    assert all(card["rule_id"] != "R-PRICE-MISSING" for card in rep["top_cards"])


# --- Capability token ---

def test_token_required_and_old_id_only_path_breaks():
    c = TestClient(app)
    created = _post(c, SAMPLE, state="baseline")
    aid = created["id"]
    assert c.get(f"/v1/analyses/{aid}/report").status_code == 404
    assert c.get(f"/v1/analyses/{aid}").status_code == 404
    assert c.get(f"/v1/analyses/{aid}/report.pdf").status_code == 404
    assert c.delete(f"/v1/analyses/{aid}").status_code == 404
    # Wrong token is indistinguishable from unknown id.
    assert c.get(f"/v1/analyses/{aid}/report",
                 headers={"Authorization": "Bearer wrong"}).status_code == 404
    assert c.get("/v1/analyses/nonexistent/report",
                 headers={"Authorization": "Bearer wrong"}).status_code == 404
    # X-Session-Token header also works.
    r = c.get(f"/v1/analyses/{aid}/report",
              headers={"X-Session-Token": created["session_token"]})
    assert r.status_code == 200


def test_only_token_hash_is_stored():
    c = TestClient(app)
    created = _post(c, SAMPLE, state="baseline")
    stored = STORE[created["id"]]
    assert stored["token_hash"] != created["session_token"]
    assert created["session_token"] not in repr(stored)
    assert len(stored["token_hash"]) == 64  # sha256 hex


def test_wrong_token_delete_does_not_delete():
    c = TestClient(app)
    created = _post(c, SAMPLE, state="baseline")
    aid, token = created["id"], created["session_token"]
    assert c.delete(f"/v1/analyses/{aid}",
                    headers={"Authorization": "Bearer nope"}).status_code == 404
    assert _report(c, aid, token)["verdict"] == "red"


# --- Retention / delete ---

def test_delete_makes_report_unretrievable():
    c = TestClient(app)
    created = _post(c, SAMPLE, state="baseline")
    aid, token = created["id"], created["session_token"]
    assert c.delete(f"/v1/analyses/{aid}",
                    headers={"Authorization": f"Bearer {token}"}).status_code == 204
    assert c.get(f"/v1/analyses/{aid}/report",
                 headers={"Authorization": f"Bearer {token}"}).status_code == 404
    assert aid not in STORE


def test_expired_analysis_unretrievable_and_swept():
    c = TestClient(app)
    keep = _post(c, SAMPLE, state="baseline")
    gone = _post(c, SAMPLE, state="baseline")
    STORE[gone["id"]]["expires_at"] = time.time() - 1
    assert c.get(f"/v1/analyses/{gone['id']}/report",
                 headers={"Authorization": f"Bearer {gone['session_token']}"}
                 ).status_code == 404
    assert gone["id"] not in STORE
    # Sweep removes expired records and leaves live ones alone.
    STORE[keep["id"]]["expires_at"] = time.time() - 1
    assert sweep_expired() == 1
    assert keep["id"] not in STORE


def test_new_analysis_has_one_hour_expiry():
    c = TestClient(app)
    created = _post(c, SAMPLE, state="baseline")
    item = STORE[created["id"]]
    assert 3599 < item["expires_at"] - item["created_at"] <= 3601


# --- PII redaction before LLM ---

def test_redact_pii_removes_email_phone_aadhaar_keeps_figures():
    text = ("Contact raj@example.com or 98765 43210, Aadhaar 1234 5678 9012. "
            "Price 7500000 rupees, interest 24% per annum.")
    out = redact_pii(text)
    assert "raj@example.com" not in out and "98765" not in out
    assert "1234 5678 9012" not in out and out.count("[REDACTED]") == 3
    assert "7500000" in out and "24%" in out


def test_llm_input_is_redacted_but_guard_uses_original():
    clauses = [{"id": "C1",
                "text": "Email raj@example.com. The grace period is 18 months."}]
    seen = {}

    def fake_call(prompt, text):
        seen["text"] = text
        return {"grace_period_months": {"value": 18, "clause_id": "C1",
                                        "quote": "grace period is 18 months"}}

    out = extract_terms_llm(clauses, call=fake_call)
    assert "raj@example.com" not in seen["text"]
    assert "[REDACTED]" in seen["text"]
    assert out["grace_period_months"]["value"] == 18
    # A quote containing a redacted token cannot pass the guard against
    # the original clause — documented trade-off, not a leak path.
    assert not verify({"clause_id": "C1", "quote": "Email [REDACTED]"},
                      clauses)
    assert verify({"clause_id": "C1", "quote": "grace period is 18 months"},
                  clauses)
