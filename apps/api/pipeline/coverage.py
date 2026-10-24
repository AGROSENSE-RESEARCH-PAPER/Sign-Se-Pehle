"""Coverage model (Final PRD, corrected verdict algorithm).

A rule counts as CHECKED only when the engine could actually evaluate
it from evidence:

- Term rules (grace, buyer interest, interest comparison, grace-zero):
  checked iff their input term value was extracted.
- Absence / document rules (arbitration, possession-missing,
  price-missing, carpet-missing): checked iff the document was fully
  readable (no pages_to_retake) — only then is "not found anywhere"
  a trustworthy outcome. If any page is unreadable, a clause could be
  hiding on that page, so none of these can be concluded.

eligible = every rule in the loaded rule set.

INCOMPLETE iff any of: unsupported state, any unreadable page, or
checked < eligible. This is deliberately strict: a document that
supplies no grace clause at all, for example, reports INCOMPLETE with
its unchecked rules listed, rather than a clean verdict — "never
green on missing data". Verified findings are still shown on an
INCOMPLETE report (hiding a verified red flag because another check
could not run would be worse); what INCOMPLETE withholds is any
"all clear" language. Relaxing the threshold later (e.g. treating an
absent grace clause as a checked non-trigger) needs no verdict-plumbing
change: only _evaluated() changes.
"""
from .rules import load_rules

# Rule ids in the baseline set, grouped by what evaluates them.
_TERM_RULES = {
    "R-POSS-GRACE": ("grace_period_months",),
    "R-BUYER-INTEREST-HIGH": ("buyer_late_interest_pct",),
    "R-INTEREST-UNEQUAL": ("buyer_late_interest_pct", "builder_delay_interest_pct"),
    "R-GRACE-ZERO-OK": ("grace_period_months",),
}
_DOCUMENT_RULES = {
    "R-ARBITRATION",
    "R-POSSESSION-MISSING",
    "R-PRICE-MISSING",
    "R-CARPET-MISSING",
}


def compute_coverage(terms, pages_to_retake):
    """Return (coverage_dict, unchecked_rule_ids)."""
    rules = load_rules()
    eligible = len(rules)
    readable = not pages_to_retake
    checked_ids = []
    unchecked_ids = []
    for rule in rules:
        rid = rule["id"]
        if rid in _TERM_RULES:
            ok = all(terms.get(t, {}).get("value") is not None for t in _TERM_RULES[rid])
        elif rid in _DOCUMENT_RULES:
            ok = readable
        else:
            # Unknown rule id (e.g. added by another track): only count
            # it checked when the document is fully readable.
            ok = readable
        (checked_ids if ok else unchecked_ids).append(rid)
    coverage = {
        "checked": len(checked_ids),
        "eligible": eligible,
        "unreadable_pages": list(pages_to_retake or []),
    }
    return coverage, unchecked_ids
