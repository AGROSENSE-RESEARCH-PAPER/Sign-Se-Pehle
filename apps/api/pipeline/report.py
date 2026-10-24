"""Report builder: verified findings + coverage -> verdict + top cards.

Corrected verdict algorithm (Final PRD):
  unsupported state OR poor coverage -> INCOMPLETE
  else any verified red finding   -> RED
  else any verified amber finding -> AMBER
  else                            -> LIMITED_CLEAR
("Poor coverage" = any unreadable page, or checked < eligible; see
pipeline/coverage.py for what counts as checked.)

Severity is a priority for review, never a legal conclusion, and
LIMITED_CLEAR is worded "no priority issues found in the checks
completed" — never "safe". An INCOMPLETE report still shows its
verified top cards (hiding a verified red flag because another check
could not run would be worse); what it withholds is any all-clear
language, and it always names the unchecked rules.

Only findings that passed the quote guard reach this builder; the
builder itself never invents a finding.
"""
ORDER = {"red": 0, "amber": 1, "green": 2}

# Baseline -> Uttarakhand candidate mapping (rules/uttarakhand-mapping.md).
# These are CANDIDATE links, not verified law: every UK entry ships with
# enabled=False and reviewer=None, so the UI must show uk_status as
# "candidate — not legally verified" and never present the UK rule as
# the basis of the finding. The finding's own basis is `provision`.
BASELINE_TO_UK = {
    "R-POSS-GRACE": ("UK-POSS-04", "direct"),
    "R-BUYER-INTEREST-HIGH": ("UK-INT-01", "subset"),
    "R-INTEREST-UNEQUAL": ("UK-INT-01", "direct"),
    "R-ARBITRATION": ("UK-DISPUTE-15", "direct"),
    "R-POSSESSION-MISSING": ("UK-POSS-03", "direct"),
    "R-PRICE-MISSING": ("UK-PAY-12", "related"),
    "R-CARPET-MISSING": ("UK-AREA-06", "direct"),
}


def _uk_info(rule_id):
    """(uk_rule_id, relation, uk_provision_ref) for a baseline rule id."""
    mapped = BASELINE_TO_UK.get(rule_id)
    if not mapped:
        return None, None, None
    uk_id, relation = mapped
    # Read the candidate registry's provision ref if the file is present;
    # failure to read it must not break the report — the link itself is
    # still shown, with its candidate status.
    import json
    import os

    path = os.path.normpath(os.path.join(
        os.path.dirname(__file__), "..", "..", "..", "rules", "uttarakhand.json"
    ))
    try:
        with open(path, encoding="utf-8") as f:
            for r in json.load(f)["rules"]:
                if r["id"] == uk_id:
                    return uk_id, relation, r["provision_ref"]
    except Exception:
        pass
    return uk_id, relation, None


def build_report(findings, language: str, coverage=None, unchecked_rules=None,
                 unsupported_state=False):
    ranked = sorted(findings, key=lambda f: ORDER.get(f["severity"], 9))
    top = ranked[:3]
    n = len(top)
    coverage = coverage or {"checked": 0, "eligible": 0, "unreadable_pages": []}
    unchecked_rules = list(unchecked_rules or [])
    incomplete = (
        unsupported_state
        or bool(coverage.get("unreadable_pages"))
        or coverage.get("checked", 0) < coverage.get("eligible", 0)
    )
    if incomplete:
        verdict = "incomplete"
    elif any(f["severity"] == "red" for f in ranked):
        verdict = "red"
    elif any(f["severity"] == "amber" for f in ranked):
        verdict = "amber"
    else:
        verdict = "limited_clear"

    checked = coverage.get("checked", 0)
    eligible = coverage.get("eligible", 0)
    if language == "hi":
        if verdict == "incomplete":
            summary = (
                f"Review adhoori hai — {checked} me se {eligible} checks ho paye. "
                "Sign karne se pehle unchecked baatein bhi poochhein."
            )
        elif n:
            summary = "Sign karne se pehle %d baatein poochhein." % n
        else:
            summary = "In checks mein koi priority issue nahi mila."
    else:
        if verdict == "incomplete":
            summary = (
                f"Review incomplete — {checked} of {eligible} checks could "
                "be completed. Ask about the unchecked items before you sign."
            )
        elif n:
            summary = f"Ask {n} things before you sign."
        else:
            summary = "No priority issues found in the checks completed."
    return {
        "verdict": verdict,
        "summary_en": summary if language == "en" else "",
        "summary_hi": summary if language == "hi" else "",
        "coverage": coverage,
        "unchecked_rules": unchecked_rules,
        "top_cards": [
            {
                "rule_id": f["rule_id"],
                "severity": f["severity"],
                "title_en": f["title_en"],
                "title_hi": f["title_hi"],
                "quote": f.get("quote"),
                "clause_ref": f"Clause {f['clause_id']}" if f.get("clause_id") else "",
                "ask_en": f["ask_en"],
                "ask_hi": f["ask_hi"],
                # Legal basis (Final PRD F7): the provision the check
                # cites. Baseline provisions are marked "to be verified"
                # in rules/baseline.json — the UI must show that status,
                # not present the provision as settled law.
                "provision": f.get("provision", ""),
                "provision_status": "unverified — check against the official RERA Act / state rules",
                "uk_rule_id": _uk_info(f["rule_id"])[0],
                "uk_relation": _uk_info(f["rule_id"])[1],
                "uk_provision_ref": _uk_info(f["rule_id"])[2],
                "uk_status": "candidate — not legally verified",
            }
            for f in top
        ],
        "all_findings": ranked,
        # checks_run now equals the real checked count (it used to be a
        # hardcoded 14 that matched nothing in the rule set).
        "checks_run": checked,
    }
