"""LLM client — provider-agnostic, HTTP-only (no vendor SDKs).
Providers, all configured by environment, all with temperature 0:
  LLM_PROVIDER=gemini   (default)  key: LLM_API_KEY, model: LLM_MODEL
                                     (default gemini-2.0-flash)
  LLM_PROVIDER=openai   OpenAI-compatible endpoint (Groq, OpenRouter,
                        or any /v1/chat/completions server):
                        LLM_BASE_URL + LLM_API_KEY + LLM_MODEL
No key set -> the caller must fall back to the code-only extractor.
The model is NEVER trusted for numbers, provisions, or flags: its
output goes through the same quote guard and the code rule engine."""
import json
import os

import httpx

PROVIDER = os.environ.get("LLM_PROVIDER", "gemini").lower()
API_KEY = os.environ.get("LLM_API_KEY", "")
MODEL = os.environ.get("LLM_MODEL", "gemini-2.0-flash")
BASE_URL = os.environ.get("LLM_BASE_URL", "https://api.openai.com/v1")


def configured() -> bool:
    return bool(API_KEY)


def complete_json(system_prompt: str, user_text: str, timeout: float = 60.0) -> dict:
    """Send one JSON-mode completion, return the parsed JSON object."""
    if not API_KEY:
        raise RuntimeError("LLM_API_KEY is not set")
    if PROVIDER == "gemini":
        url = (
            "https://generativelanguage.googleapis.com/v1beta/models/"
            f"{MODEL}:generateContent"
        )
        body = {
            "contents": [{"parts": [{"text": system_prompt + "\n\n" + user_text}]}],
            "generationConfig": {"temperature": 0, "responseMimeType": "application/json"},
        }
        with httpx.Client(timeout=timeout) as client:
            r = client.post(url, json=body, headers={"x-goog-api-key": API_KEY})
            r.raise_for_status()
            text = r.json()["candidates"][0]["content"]["parts"][0]["text"]
        return json.loads(text)
    # OpenAI-compatible
    url = BASE_URL.rstrip("/") + "/chat/completions"
    body = {
        "model": MODEL,
        "temperature": 0,
        "response_format": {"type": "json_object"},
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_text},
        ],
    }
    with httpx.Client(timeout=timeout) as client:
        r = client.post(
            url, json=body, headers={"Authorization": f"Bearer {API_KEY}"}
        )
        r.raise_for_status()
        text = r.json()["choices"][0]["message"]["content"]
    return json.loads(text)
