"""LLM extractor: clauses -> terms, same shape as the code extractor.
Output is validated here (known keys, right value types) and then
re-validated by the quote guard in the caller. Anything that fails
either check falls back to the code-only term for that field."""
import os

from pipeline.redact import redact_pii

from .client import complete_json, configured

_PROMPT_PATH = os.path.join(os.path.dirname(__file__), "prompts", "extraction.md")

TERM_KEYS = [
    "total_price_inr",
    "carpet_area_sqft",
    "possession_date",
    "grace_period_months",
    "buyer_late_interest_pct",
    "builder_delay_interest_pct",
    "arbitration_clause",
]


def _load_prompt() -> str:
    with open(_PROMPT_PATH, encoding="utf-8") as f:
        return f.read()


def _validate(raw: dict):
    if not isinstance(raw, dict):
        return None
    out = {}
    for key in TERM_KEYS:
        item = raw.get(key)
        if not isinstance(item, dict):
            out[key] = {"value": None, "clause_id": None, "quote": None}
            continue
        value = item.get("value")
        if key == "arbitration_clause":
            value = True if value is True else None
        elif key == "possession_date":
            value = value if isinstance(value, str) else None
        else:
            value = value if isinstance(value, (int, float)) else None
        quote = item.get("quote")
        quote = quote if isinstance(quote, str) else None
        clause_id = item.get("clause_id")
        clause_id = clause_id if isinstance(clause_id, str) else None
        if value is None:
            quote, clause_id = None, None
        out[key] = {"value": value, "clause_id": clause_id, "quote": quote}
    return out


def extract_terms_llm(clauses, call=None):
    """Returns validated LLM terms, or None if the LLM is not
    configured or its call/parsing fails. `call` is injectable for tests."""
    if call is None and not configured():
        return None
    # PII minimisation: the LLM sees redacted text only. Quotes the LLM
    # returns are still verified against the ORIGINAL clauses by the
    # caller, so a redacted quote cannot pass the guard (see
    # pipeline/redact.py for the full trade-off note).
    text = redact_pii("\n\n".join(f"[{c['id']}] {c['text']}" for c in clauses))
    # Cap the prompt so one analysis stays cheap and fast.
    text = text[:100_000]
    try:
        raw = call(_load_prompt(), text) if call else complete_json(_load_prompt(), text)
        return _validate(raw)
    except Exception:
        return None
