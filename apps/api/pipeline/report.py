"""Report builder: verified findings -> verdict + top cards.
Verdict: red if any red finding, else amber if any amber, else green.
Green is worded 'no red flags in the checks we run', never 'safe'."""
ORDER = {"red": 0, "amber": 1, "green": 2}


def build_report(findings, language: str):
    ranked = sorted(findings, key=lambda f: ORDER.get(f["severity"], 9))
    verdict = "green"
    if any(f["severity"] == "red" for f in ranked):
        verdict = "red"
    elif any(f["severity"] == "amber" for f in ranked):
        verdict = "amber"
    top = ranked[:3]
    n = len(top)
    if language == "hi":
        summary = (
            "Sign karne se pehle %d baatein poochhein." % n
            if n
            else "In checks mein koi red flag nahi mila."
        )
    else:
        summary = (
            f"Ask {n} things before you sign."
            if n
            else "No red flags in the checks we run."
        )
    return {
        "verdict": verdict,
        "summary_en": summary if language == "en" else "",
        "summary_hi": summary if language == "hi" else "",
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
            }
            for f in top
        ],
        "all_findings": ranked,
        "checks_run": 14,
    }
