"""PII minimisation for LLM input ONLY (Final PRD security section).

redact_pii() is applied to the text sent to the LLM extractor and to
nothing else. The regex extractor, the clause splitter and the quote
guard all keep working on the ORIGINAL document text, so:

- a finding's quote is always checked verbatim against the original
  (the guard never sees redacted text), and
- an LLM term whose quote contains a redacted token cannot pass the
  guard and falls back to the code-only term for that field — by
  design, not by accident. No PII-bearing quote can therefore leak
  through the LLM path into a visible finding, and no unquoted
  finding can surface either.

Patterns redacted: email addresses, Indian phone-number-like
sequences (10 digits starting 6-9, optional +91 / spaces / hyphens),
and Aadhaar-like 12-digit sequences (contiguous or grouped 4-4-4).
Ordinary agreement figures (prices, areas, percentages, dates) do not
match these patterns and pass through untouched.
"""
import re

_EMAIL = re.compile(r"[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}")
_PHONE = re.compile(r"(?:\+?91[\s-]?)?[6-9]\d{4}[\s-]?\d{5}\b")
_AADHAAR = re.compile(r"\b\d{4}[\s-]?\d{4}[\s-]?\d{4}\b")

_REDACTED = "[REDACTED]"


def redact_pii(text: str) -> str:
    # Aadhaar first: a 12-digit run also contains a 10-digit phone-like
    # run, so the phone pattern must not get to it first.
    text = _AADHAAR.sub(_REDACTED, text)
    text = _EMAIL.sub(_REDACTED, text)
    text = _PHONE.sub(_REDACTED, text)
    return text
