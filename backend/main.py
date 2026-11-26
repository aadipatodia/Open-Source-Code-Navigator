"""FastAPI entry point — wires routers together, configures CORS, cleans up on shutdown.

Each feature lives in its own module (repo_index, repo_guide, issue_finder,
code_analyzer, chat). This file registers their routers and does nothing else.
"""

import os
from contextlib import asynccontextmanager

import uvicorn
from fastapi import Depends, FastAPI
from fastapi.middleware.cors import CORSMiddleware

import chat
import code_analyzer
import issue_finder
import repo_guide
import repo_index
from auth import require_user

CORS_ORIGINS = [
    "http://localhost:3000",
    "http://localhost:3001",
    "http://localhost:5173",
    "https://code-scout.vercel.app",
    "https://open-source-code-navigator.vercel.app",
    *[o.strip() for o in os.getenv("ALLOWED_ORIGINS", "").split(",") if o.strip()],
]


@asynccontextmanager
async def lifespan(_app: FastAPI):
    """Clean up cloned repo temp directories when the server shuts down."""
    yield
    repo_index.clear_cache()


app = FastAPI(title="Code Scout API", version="4.0.0", lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_origin_regex=r"https://(code-scout|open-source-code-navigator)(-[a-z0-9-]+)?\.vercel\.app",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Every API route needs a signed-in user; only the health check below stays open.
signed_in = [Depends(require_user)]
app.include_router(repo_index.router, dependencies=signed_in)
app.include_router(repo_guide.router, dependencies=signed_in)
app.include_router(issue_finder.router, dependencies=signed_in)
app.include_router(code_analyzer.router, dependencies=signed_in)
app.include_router(chat.router, dependencies=signed_in)


@app.get("/")
async def root():
    """Health-check endpoint."""
    return {"message": "API is running."}


if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
