"""Run the whole backend locally, no AWS needed.

    cd backend/dev
    pip install -r requirements-dev.txt
    uvicorn local_server:app --reload --port 8000

Uses the in-memory store and the rule-based agent unless you set STORE / AGENT_MODE.
"""
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "layers" / "core" / "python"))

from fastapi import FastAPI, Request  # noqa: E402
from fastapi.middleware.cors import CORSMiddleware  # noqa: E402
from fastapi.responses import JSONResponse  # noqa: E402

from core import router  # noqa: E402

app = FastAPI(title="AegisAI local API")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])


@app.api_route("/{path:path}", methods=["GET", "POST"])
async def any_route(path: str, request: Request):
    raw = await request.body()
    try:
        body = json.loads(raw) if raw else {}
    except json.JSONDecodeError:
        return JSONResponse({"error": "body must be valid JSON"}, status_code=400)
    status, payload = router.handle(request.method, "/" + path, dict(request.query_params), body)
    return JSONResponse(payload, status_code=status)
