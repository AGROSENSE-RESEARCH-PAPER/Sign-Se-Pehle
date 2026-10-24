"""Validate rules/uttarakhand.json. Exit 0 only if every check passes.

Checks: JSON parses; exactly the 22 Final PRD IDs, each once; every
entry has id/title/category/provision_ref/source_basis/release_status/
enabled/reviewer/reviewed_at/version; every entry has enabled=False,
reviewer=None and reviewed_at=None (no rule claims legal verification).
"""
import json
import os
import sys

EXPECTED = [
    "UK-INT-01", "UK-ADV-02", "UK-POSS-03", "UK-POSS-04", "UK-PLAN-05",
    "UK-AREA-06", "UK-REF-07", "UK-DELAY-08", "UK-DEFECT-09", "UK-REG-10",
    "UK-SCOPE-11", "UK-PAY-12", "UK-CHG-13", "UK-CANCEL-14", "UK-DISPUTE-15",
    "UK-FM-16", "UK-AMEN-17", "UK-HAND-18", "UK-MAINT-19", "UK-CONS-20",
    "UK-NOTICE-21", "UK-JUR-22",
]

REQUIRED = (
    "id", "title", "category", "provision_ref", "source_basis",
    "release_status", "enabled", "reviewer", "reviewed_at", "version",
)


def main():
    path = sys.argv[1] if len(sys.argv) > 1 else os.path.join(
        os.path.dirname(__file__), "..", "rules", "uttarakhand.json")
    with open(os.path.normpath(path), encoding="utf-8") as f:
        registry = json.load(f)
    rules = registry["rules"]
    errors = []
    ids = [r["id"] for r in rules]
    if sorted(ids) != sorted(EXPECTED):
        errors.append(f"ID set mismatch: got {sorted(ids)}")
    if len(ids) != len(set(ids)):
        errors.append("duplicate IDs present")
    for rule in rules:
        for field in REQUIRED:
            if field not in rule:
                errors.append(f"{rule.get('id', '?')}: missing {field}")
        if rule.get("enabled") is not False:
            errors.append(f"{rule['id']}: enabled is not False")
        if rule.get("reviewer") is not None or rule.get("reviewed_at") is not None:
            errors.append(f"{rule['id']}: claims a reviewer/review date")
        if "reviewed" in str(rule.get("release_status", "")).lower().replace(
                "legal review pending", "").replace("reviewer approval required", ""):
            errors.append(f"{rule['id']}: release_status claims review")
    if registry.get("state_code") != "UK":
        errors.append("registry state_code is not UK")
    if errors:
        print("FAIL")
        for error in errors:
            print(f" - {error}")
        return 1
    print(f"PASS: {len(rules)} rules, all IDs unique and present, "
          f"all fields present, enabled=0, reviewer=None for all")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
