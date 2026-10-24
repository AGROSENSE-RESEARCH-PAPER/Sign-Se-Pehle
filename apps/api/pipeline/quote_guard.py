"""Quote guard (PRD F6): a finding is shown ONLY if its quote appears
verbatim in its clause after normalising spaces and punctuation."""
import re


def norm(s: str) -> str:
    return re.sub(r"[^a-z0-9]+", " ", s.lower()).strip()


def verify(finding, clauses) -> bool:
    clause = next(
        (c for c in clauses if c["id"] == finding.get("clause_id")), None
    )
    if clause is None:
        return False
    quote = norm(finding.get("quote") or "")
    return len(quote) >= 12 and quote in norm(clause["text"])
