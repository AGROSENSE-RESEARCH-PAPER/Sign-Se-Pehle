"""Uttarakhand rule registry loader (stdlib only).

Loads rules/uttarakhand.json, which is a CANDIDATE backlog: no rule in
it is legally verified, so every entry ships with enabled=False,
reviewer=None and reviewed_at=None. The engine must only ever act on
list_enabled_rules() — disabled rules never produce findings.
"""
import json
import os

_DEFAULT_PATH = os.path.join(
    os.path.dirname(__file__), "..", "..", "..", "rules", "uttarakhand.json"
)

_REQUIRED_FIELDS = (
    "id",
    "title",
    "category",
    "provision_ref",
    "source_basis",
    "release_status",
    "enabled",
    "reviewer",
    "reviewed_at",
    "version",
)


def load_registry(path=None):
    """Return the full registry dict (state, version, note, rules)."""
    with open(os.path.normpath(path or _DEFAULT_PATH), encoding="utf-8") as f:
        return json.load(f)


def load_rules(path=None):
    """Return the list of all 22 candidate rule entries."""
    return load_registry(path)["rules"]


def list_enabled_rules(path=None):
    """Rules cleared for use. Currently empty by design: none are verified."""
    return [r for r in load_rules(path) if r["enabled"] is True]


def list_disabled_rules(path=None):
    """Rules that must never produce findings until legally reviewed."""
    return [r for r in load_rules(path) if r["enabled"] is not True]


def get_rule(rule_id, path=None):
    """Return the rule entry for rule_id, or None if it does not exist."""
    for rule in load_rules(path):
        if rule["id"] == rule_id:
            return rule
    return None


def get_provision_ref(rule_id, path=None):
    """Return the provision_ref for rule_id, or None if it does not exist."""
    rule = get_rule(rule_id, path)
    return rule["provision_ref"] if rule else None
