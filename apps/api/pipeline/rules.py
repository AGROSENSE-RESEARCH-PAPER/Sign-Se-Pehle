"""Rule engine: terms + rules JSON -> findings. Numbers are computed
in code here; an LLM classifier is NOT used in this MVP — the
classifier rules in the PRD are a later step. Findings without a
quote are dropped by the caller via the quote guard."""
import json
import os

from .quote_guard import verify

_RULES_PATH = os.path.join(
    os.path.dirname(__file__), "..", "..", "..", "rules", "baseline.json"
)


def load_rules():
    with open(os.path.normpath(_RULES_PATH), encoding="utf-8") as f:
        return json.load(f)["rules"]


def _finding(rule, term, severity=None):
    return {
        "rule_id": rule["id"],
        "severity": severity or rule["severity"],
        "title_en": rule["title_en"],
        "title_hi": rule["title_hi"],
        "ask_en": rule["ask_en"],
        "ask_hi": rule["ask_hi"],
        "provision": rule["provision"],
        "clause_id": term.get("clause_id"),
        "quote": term.get("quote"),
    }


def run_rules(terms, clauses):
    rules = {r["id"]: r for r in load_rules()}
    raw = []
    grace = terms["grace_period_months"]
    if grace["value"] is not None and grace["value"] > 0:
        f = _finding(rules["R-POSS-GRACE"], grace)
        f["title_en"] = f"Possession date can slip by {int(grace['value'])} months"
        raw.append(f)
    buyer = terms["buyer_late_interest_pct"]
    builder = terms["builder_delay_interest_pct"]
    if buyer["value"] is not None and buyer["value"] >= 18:
        raw.append(_finding(rules["R-BUYER-INTEREST-HIGH"], buyer))
    if (
        buyer["value"] is not None
        and builder["value"] is not None
        and buyer["value"] > builder["value"]
    ):
        raw.append(_finding(rules["R-INTEREST-UNEQUAL"], buyer))
    arb = terms["arbitration_clause"]
    if arb["value"] is True:
        raw.append(_finding(rules["R-ARBITRATION"], arb))
    if terms["possession_date"]["value"] is None:
        raw.append(
            _finding(
                rules["R-POSSESSION-MISSING"],
                {"clause_id": None, "quote": None},
            )
        )
    if terms["total_price_inr"]["value"] is None:
        raw.append(
            _finding(
                rules["R-PRICE-MISSING"],
                {"clause_id": None, "quote": None},
            )
        )
    if terms["carpet_area_sqft"]["value"] is None:
        raw.append(
            _finding(
                rules["R-CARPET-MISSING"],
                {"clause_id": None, "quote": None},
            )
        )
    # Quote guard (Final PRD F6, "no quote, no flag"): ONLY findings
    # whose quote appears verbatim in their clause may surface. The
    # "missing" findings (possession/price/carpet absent) have no quote
    # by definition, so they are never visible findings: a missing term
    # is a coverage gap (see pipeline/coverage.py), not a card. Dropping
    # them here is what keeps an unquoted finding from ever rendering.
    return [f for f in raw if f.get("quote") and verify(f, clauses)]
