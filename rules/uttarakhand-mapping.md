# Baseline → Uttarakhand mapping (for the engine track)

The current engine (`apps/api/pipeline/rules.py`) fires the 8 checks in
`rules/baseline.json`. None of those checks is a verified Uttarakhand
rule: their provisions are explicitly marked "to be verified". This
file maps each baseline check to the Final PRD Uttarakhand rule ID it
*corresponds to in subject matter* — it does **not** make the check
verified, and it does not enable any UK rule. The engine track must
not wire a UK ID to a finding until that UK rule is legally reviewed
and its `enabled` flag is flipped by a reviewer (see
`rules/uttarakhand.json`, where all 22 are currently `enabled: false`).

## Direct mappings (same check, new ID)

| Baseline check | UK ID | Notes |
|---|---|---|
| `R-POSS-GRACE` — possession can slip by N months (grace > 0) | `UK-POSS-04` | Same check: unqualified grace period beyond delivery date. |
| `R-INTEREST-UNEQUAL` — buyer rate > builder rate | `UK-INT-01` | Primary mapping: unequal buyer/promoter interest terms (UK Rule 15; RERA s.13(2)). |
| `R-BUYER-INTEREST-HIGH` — buyer late rate >= 18% | `UK-INT-01` (partial) | Buyer-side only; it is a subset of the parity check, not a separate UK rule. Fold into UK-INT-01, do not keep as a standalone UK finding. |
| `R-ARBITRATION` — disputes sent to arbitration | `UK-DISPUTE-15` | Same check: exclusive arbitration route (RERA s.79 / case law). Must not be labelled "invalid" without case-law review. |
| `R-POSSESSION-MISSING` — no clear possession date | `UK-POSS-03` | Same check: possession date / delivery commitments. |
| `R-CARPET-MISSING` — carpet area not stated | `UK-AREA-06` | Same check: carpet area missing / unclear (RERA s.13(2), definitions). |

## Partial mappings (related, not equivalent)

| Baseline check | UK ID | Notes |
|---|---|---|
| `R-PRICE-MISSING` — total price not clearly stated | `UK-PAY-12` (partial) | UK-PAY-12 is about the *payment schedule* being unclear; total-price clarity is related but not the same check. Needs a separate decision before wiring. |
| `R-GRACE-ZERO-OK` — no grace period (green confirmation) | — (none) | Not a flag at all; it is the negative case of UK-POSS-04. Do not create a UK finding from it. |

## UK rules with NO baseline counterpart (new checks to build later)

`UK-ADV-02` (advance > 10%), `UK-PLAN-05` (plan change),
`UK-REF-07` (refund rights), `UK-DELAY-08` (builder delay interest
wording — note: the engine already extracts `builder_delay_interest_pct`
but fires no finding on it alone), `UK-DEFECT-09`, `UK-REG-10`,
`UK-SCOPE-11`, `UK-CHG-13`, `UK-CANCEL-14`, `UK-FM-16`, `UK-AMEN-17`,
`UK-HAND-18`, `UK-MAINT-19`, `UK-CONS-20`, `UK-NOTICE-21`, `UK-JUR-22`.

## Wiring rule for the engine track

1. Keep firing baseline IDs for now (demo behaviour unchanged).
2. When a UK rule is reviewed and enabled, add a UK-ID finding
   alongside — or replacing — its baseline counterpart above, using
   `apps/api/rules/uttarakhand.py::get_provision_ref()` for the
   provision shown to the user.
3. Never emit a UK-ID finding while that rule's `enabled` is false.
