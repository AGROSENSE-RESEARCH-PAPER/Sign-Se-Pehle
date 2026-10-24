"""Extractor (MVP, code-only — no LLM yet): clauses -> key terms as JSON.
Every value carries its clause id and an exact quote sentence from that
clause. A value the extractor cannot find is None, never a guess.
Numbers are never computed by an LLM; the rule engine computes them."""
import re


def _sentence_with(text: str, pattern: str):
    """First sentence in `text` matching `pattern`, or None."""
    sentences = re.split(r"(?<=[.!])\s+", text.replace("\n", " "))
    for s in sentences:
        if re.search(pattern, s, re.IGNORECASE):
            return s.strip()
    return None


def _term(clauses, pattern, value_fn):
    for c in clauses:
        quote = _sentence_with(c["text"], pattern)
        if quote:
            value = value_fn(quote)
            if value is not None:
                return {"value": value, "clause_id": c["id"], "quote": quote}
    return {"value": None, "clause_id": None, "quote": None}


def _first_number(s: str):
    m = re.search(r"(\d+(?:\.\d+)?)", s)
    return float(m.group(1)) if m else None


def extract_terms(clauses):
    terms = {}
    terms["grace_period_months"] = _term(
        clauses, r"grace period", lambda q: _first_number(q)
    )
    # Buyer late interest: the interest sentence mentioning the Allottee.
    buyer = None
    for c in clauses:
        q = _sentence_with(c["text"], r"interest.*allottee|allottee.*interest")
        if q:
            v = _first_number(q)
            if v is not None:
                buyer = {"value": v, "clause_id": c["id"], "quote": q}
                break
    terms["buyer_late_interest_pct"] = buyer or {
        "value": None,
        "clause_id": None,
        "quote": None,
    }
    # Builder delay interest: interest sentence mentioning the Promoter
    # paying the allottee, e.g. "Promoter shall pay interest at X%".
    builder = None
    for c in clauses:
        q = _sentence_with(c["text"], r"promoter shall pay interest")
        if q:
            v = _first_number(q)
            if v is not None:
                builder = {"value": v, "clause_id": c["id"], "quote": q}
                break
    terms["builder_delay_interest_pct"] = builder or {
        "value": None,
        "clause_id": None,
        "quote": None,
    }
    terms["arbitration_clause"] = _term(
        clauses, r"arbitration", lambda q: True
    )
    terms["carpet_area_sqft"] = _term(
        clauses, r"carpet area", lambda q: _first_number(q)
    )
    terms["total_price_inr"] = _term(
        clauses, r"total (?:price|consideration)",
        lambda q: _first_number(q.replace(",", "")),
    )
    terms["possession_date"] = _term(
        clauses, r"possession date",
        lambda q: re.search(
            r"(20\d\d-\d\d-\d\d|\d{1,2}\s+[A-Za-z]+\s+20\d\d)", q
        ).group(1)
        if re.search(r"(20\d\d-\d\d-\d\d|\d{1,2}\s+[A-Za-z]+\s+20\d\d)", q)
        else None,
    )
    return terms
