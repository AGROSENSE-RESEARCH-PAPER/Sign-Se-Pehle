# Sign Se Pehle — Render API deploy checklist (human dashboard steps)

> Status: the API is **NOT deployed yet**. Render is not connected to this
> workspace, so these steps must be done by a human in the Render dashboard.
> Nothing below contains a key value — the key is typed into Render only,
> never committed to the repo and never written in any file.

## 1. Create the web service (Render dashboard)

1. Render → **New → Web Service** → **Build from this GitHub repo**:
   `AGROSENSE-RESEARCH-PAPER/Sign-Se-Pehle`
   (or: **New from Blueprint** and point it at `render.yaml` in the repo root —
   the blueprint already sets Docker + Free plan + health check `/health`.)
2. If creating manually (not from blueprint):
   - **Environment:** Docker
   - **Dockerfile path:** `./apps/api/Dockerfile`
   - **Docker context:** `./apps/api`
   - **Plan:** Free
   - **Health check path:** `/health`
3. Deploy and wait for it to go **Live**. Copy the service URL, e.g.
   `https://sign-se-pehle-api.onrender.com` (your actual URL will differ).

## 2. Set the LLM environment variables (Render → service → Environment)

The API's LLM client is provider-agnostic and already supports
OpenAI-compatible providers, so use **OpenRouter** (not Gemini):

| Variable | Value |
|---|---|
| `LLM_PROVIDER` | `openai` |
| `LLM_BASE_URL` | `https://openrouter.ai/api/v1` |
| `LLM_MODEL` | a `:free` OpenRouter model (any model id ending in `:free`) |
| `LLM_API_KEY` | your own OpenRouter API key — typed into the Render dashboard only |

Notes:
- **Free-tier limits for `:free` models: 50 requests/day, 20 requests/min,
  no credits needed.** Pick the model in the dashboard at deploy time; do not
  hard-code a model id here that could go stale.
- **Never commit the key, never paste it into chat/files.** If it ever leaks,
  revoke it in OpenRouter and set a fresh one in Render.
- **If the key is missing or the quota is hit, the site still works:**
  the API falls back to the code-only regex extractor and quote guard, and
  the frontend shows a labelled sample report when the API is unreachable.

## 3. Connect the frontend to the API

1. **GitHub Pages (primary demo link):** the frontend is a static export, so
   `NEXT_PUBLIC_API_URL` is baked in **at build time**. Set it as a
   repository/workflow variable with the Render URL from step 1, then
   re-run the Pages workflow (push to `main` touching `apps/web/**`, or
   re-run the workflow). Until then the site shows the labelled sample
   fallback, not live analysis.
2. **Vercel (backup link):** set the same `NEXT_PUBLIC_API_URL` as an
   environment variable on the Vercel project and redeploy.
3. Verify live: open the Pages site, pick **Uttarakhand**, upload the sample
   agreement — the verdict must come from the API (no "API not reachable"
   note), and `GET <render-url>/health` must return 200.

## 4. Demo-day note: Render free cold start

Render's free tier sleeps when idle — the first request after a pause takes
roughly **~50 seconds** to wake. **Warm the API right before any demo**
(open `<render-url>/health` once and wait for 200) so the first upload does
not look broken.
