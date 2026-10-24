# Sign Se Pehle

Upload a builder-buyer Agreement for Sale, get one clear verdict before you sign: green / amber / red, plus at most 3 "fix these first" cards. Hindi or English, no sign-up, private by default.

## Product rules (from the PRD)
- One answer first, never a wall of text. Verdict screen shows max 3 cards.
- No quote, no flag: every finding must quote the buyer's own clause verbatim.
- Never "safe to sign" or "illegal". Green means "no red flags in the checks we run".
- Disclaimer on every report: this is a checklist, not legal advice. Ask a lawyer before you sign.
- Delete by default: document and text are removed unless the user saves the report.

## Live demo
- **Web (GitHub Pages, public):** https://agrosense-research-paper.github.io/Sign-Se-Pehle/
  - Since 2026-10-24 this URL serves Vidish's Figma UI in `apps/figma-ui/` (Vite, synthetic demo journey: home → state → reading → 3-question sample report → next steps). It has **no real upload and no API calls** — it is a UI demo, not the full product.
  - The previous Next.js v1 app is still in the repo under `apps/web/` but is **not** built or deployed by `.github/workflows/pages.yml` anymore. Revert that workflow to restore v1 on Pages.
- **Web (Vercel, public, backup):** https://sign-se-pehle-h34ud34ce-vivekbartwal158-5099s-projects.vercel.app/
- **API:** not deployed yet — deploy it with the Render blueprint below, then set the repo variable `NEXT_PUBLIC_API_URL` (and the Vercel env var, for the Vercel copy) and redeploy. Until then the web demo shows the planted-issue sample report (labelled as a sample) when the API is unreachable.
- **Note:** GitHub Pages hosts static sites only — it cannot run the FastAPI backend. The Pages site is the frontend; the API still needs Render (or any Python host).

## Deploy the API on Render
1. Render → New → Web Service → Build from the `AGROSENSE-RESEARCH-PAPER/Sign-Se-Pehle` GitHub repo (or "New from Blueprint" with `render.yaml`).
2. Environment: Docker, Dockerfile `./apps/api/Dockerfile`, context `./apps/api`, plan Free, health check `/health`.
3. Env vars: `LLM_PROVIDER=gemini`, `LLM_MODEL=gemini-2.0-flash`, `LLM_API_KEY=<your key>` (optional — without it, the regex extractor runs).
4. Note the service URL (e.g. `https://sign-se-pehle-api.onrender.com`), set it as `NEXT_PUBLIC_API_URL` in the Vercel project, and redeploy the web app. Render free tier cold-starts, so warm the API URL once before a demo.

## Run it (MVP, verified 2026-10-24)

```bash
# API (terminal 1) — from apps/api/
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
# -> http://localhost:8000/docs

# Web v1 (terminal 2) — from apps/web/ (NOT deployed on Pages since 2026-10-24)
npm install
npm run dev
# -> http://localhost:3000  (calls the API at http://localhost:8000;
#    override with NEXT_PUBLIC_API_URL)

# Live Pages UI (terminal 2, alternative) — from apps/figma-ui/
npm install
npm run dev
# -> http://localhost:5173  (synthetic demo only, no API)
```

## Layout
- `apps/figma-ui/` — Vite UI currently deployed on GitHub Pages (Vidish, 2026-10-24): `index.html`, `app.js`, `styles.css`. Synthetic demo only.
- `apps/web/` — Next.js 14 app (v1, retained but not deployed on Pages since 2026-10-24) (mobile-first, `app/page.js`, components `VerdictCircle`, `FlagCard`, `ClauseSheet`, `LangToggle`, strings in `messages/en.json`, `messages/hi.json`, textures in `public/assets/`). Design: deep maroon / saffron / ivory / peacock teal, toran strip on home only, BLEND rule (textures melt into the ivory surface), opposite-sweep cards.
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
- API: `pytest` 7 passed (pipeline, LLM validation/fallback, OCR). Sample report verdict **red**, top cards `R-POSS-GRACE` (18-month grace), `R-INTEREST-UNEQUAL` (24% buyer vs 10% builder), `R-ARBITRATION` — every top card carries a verbatim quote.
- Web v1: `npm run build` passes (Next 14.2.33, after the 14.2.5 security warning).
- Pages UI: `npm run build` passes (Vite 6, relative `./` base so it works under `/Sign-Se-Pehle/`).

## LLM + OCR (added 2026-10-24)
- **LLM extractor (`apps/api/llm/`)** — provider-agnostic HTTP client, temperature 0, JSON-only. Set `LLM_PROVIDER=gemini` (default, model `LLM_MODEL`, default `gemini-2.0-flash`) or `LLM_PROVIDER=openai` with `LLM_BASE_URL` (Groq/OpenRouter/any OpenAI-compatible server), plus `LLM_API_KEY`. The LLM only extracts terms with exact quotes; the quote guard drops any term whose quote is not verbatim in its clause, and the code rule engine still decides every flag. No key set → the code-only regex extractor runs (verified: sample still red).
- **OCR (`apps/api/pipeline/ocr.py`)** — Tesseract, Hindi + English. Scanned PDFs are rendered with `pdftoppm` and OCR'd page by page; photos are OCR'd directly. Low-confidence pages (< 50) are returned as `pages_to_retake` on the status/report and shown in the web UI. If tesseract is not installed on the server, the API returns a clear 422 telling you to install `tesseract-ocr`, `tesseract-ocr-hin`, `tesseract-ocr-eng` instead of failing silently.
- Verified: photo of a sample clause → OCR → grace + arbitration flags, verdict red; mocked-LLM test — an invented "99-month" claim was dropped by the quote guard while the real 18-month claim stood.

## Honest MVP limits (next steps, in order)
1. **LLM needs a key, OCR needs tesseract on the server.** Neither is bundled; both degrade cleanly (regex fallback / clear 422).
2. **8 rules, not 20–25**, and provision text is **not yet verified** against the official RERA Act / state rules — a person must verify every provision before any public launch.
3. **One baseline rule set, not one state.** The v1 state is still undecided.
4. **PDF is English-only** (standard PDF fonts do not render Devanagari).
5. Results live in API memory only; a restart clears them.

## Status
- Remote: `AGROSENSE-RESEARCH-PAPER/Sign-Se-Pehle` (public, empty before this push).
- Open decisions: v1 state, source of the first 10–15 test agreements, LLM/OCR provider + cost ceiling, who reviews rule provisions.
