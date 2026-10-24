"""Clause splitter: text -> [{id, heading, text, page}].
Splits on 'Clause N' headings; text before the first heading is C0.
Agreements with irregular numbering fall back to one clause per
blank-line paragraph (LLM splitter is a later step, per PRD)."""
import re

CLAUSE_RE = re.compile(r"(?im)^\s*clause\s+(\d+)\b[.:]?\s*(.*)$")


def split_clauses(text: str):
    matches = list(CLAUSE_RE.finditer(text))
    if not matches:
        paras = [p.strip() for p in text.split("\n\n") if p.strip()]
        return [
            {"id": f"C{i+1}", "heading": "", "text": p, "page": 1}
            for i, p in enumerate(paras)
        ]
    clauses = []
    for i, m in enumerate(matches):
        start = m.start()
        end = matches[i + 1].start() if i + 1 < len(matches) else len(text)
        body = text[start:end].strip()
        clauses.append(
            {
                "id": f"C{m.group(1)}",
                "heading": (m.group(2) or "").strip(),
                "text": body,
                "page": 1,
            }
        )
    return clauses
