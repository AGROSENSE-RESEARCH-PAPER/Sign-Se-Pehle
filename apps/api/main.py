"""Sign Se Pehle API — FastAPI entrypoint.
Run: uvicorn main:app --reload --port 8000   (from apps/api/)
Docs: http://localhost:8000/docs"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from routes.analyses import router

app = FastAPI(title="Sign Se Pehle API")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_methods=["*"],
    allow_headers=["*"],
)
app.include_router(router)


@app.get("/health")
async def health():
    return {"status": "ok"}
