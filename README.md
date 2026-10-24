# Sign Se Pehle

Upload a builder-buyer Agreement for Sale, get one clear verdict before you sign: green / amber / red, plus at most 3 "fix these first" cards. Hindi or English, no sign-up, private by default.

## Product rules (from the PRD)
- One answer first, never a wall of text. Verdict screen shows max 3 cards.
- No quote, no flag: every finding must quote the buyer's own clause verbatim.
- Never "safe to sign" or "illegal". Green means "no red flags in the checks we run".
- Disclaimer on every report: this is a checklist, not legal advice. Ask a lawyer before you sign.
- Delete by default: document and text are removed unless the user saves the report.

## Run it (MVP, verified 2026-10-24)

```bash
# API (terminal 1) — from apps/api/
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
# -> http://localhost:8000/docs

# Web (terminal 2) — from apps/web/
npm install
npm run dev
# -> http://localhost:3000  (calls the API at http://localhost:8000;
#    override with NEXT_PUBLIC_API_URL)
```

## Layout
- `apps/web/` — Next.js 14 app (mobile-first, `app/page.js`, components `VerdictCircle`, `FlagCard`, `ClauseSheet`, `LangToggle`, strings in `messages/en.json`, `messages/hi.json`, textures in `public/assets/`). Design: deep maroon / saffron / ivory / peacock teal, toran strip on home only, BLEND rule (textures melt into the ivory surface), opposite-sweep cards.
- `apps/api/` — FastAPI service. Pipeline in order: intake → clause splitter → extractor → rule engine → quote guard → report builder. Tests in `apps/api/tests/` (`pytest`).
- `rules/baseline.json` — 8 baseline rules (PRD target is 20–25 for one state).
- `eval/sample_agreement.txt` — planted-issue sample agreement used by the tests and the web "Try a sample" button.
- `docs/prototype-2026-10-24.html` — the original single-file UI prototype this Next.js app was converted from.

## API (PRD, implemented)
- `POST /v1/analyses` — upload file, state, language; returns `{id, status: "queued"}`
- `GET /v1/analyses/{id}` — poll progress (`queued, reading, splitting, checking, ready, failed`; MVP runs synchronously, so it is `ready` immediately)
- `GET /v1/analyses/{id}/report` — `{verdict, top_cards[3], all_findings[]}`
- `GET /v1/analyses/{id}/report.pdf` — one-page PDF (English text only in this MVP)
- `DELETE /v1/analyses/{id}` — delete document, text and report (204)

## Verified on the sample agreement
- API: `pytest` 2 passed. Sample report verdict **red**, top cards `R-POSS-GRACE` (18-month grace), `R-INTEREST-UNEQUAL` (24% buyer vs 10% builder), `R-ARBITRATION` — every top card carries a verbatim quote.
- Web: `npm run build` passes (Next 14.2.33, after the 14.2.5 security warning).

## Honest MVP limits (next steps, in order)
1. **No LLM, no OCR yet.** Extraction is regex/code-only; scanned/photo PDFs without a text layer return a 422 asking for a retake. LLM extractor + OCR (Hindi/English) is the next pipeline step.
2. **8 rules, not 20–25**, and provision text is **not yet verified** against the official RERA Act / state rules — a person must verify every provision before any public launch.
3. **One baseline rule set, not one state.** The v1 state is still undecided.
4. **PDF is English-only** (standard PDF fonts do not render Devanagari).
5. Results live in API memory only; a restart clears them.

## Status
- Remote: `AGROSENSE-RESEARCH-PAPER/Sign-Se-Pehle` (public, empty before this push).
- Open decisions: v1 state, source of the first 10–15 test agreements, LLM/OCR provider + cost ceiling, who reviews rule provisions.
