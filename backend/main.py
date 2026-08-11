"""Open-Source Code Navigator API.

Helps someone find a project worth contributing to and understand it well enough
to open a pull request. One module per job, each small enough to read in a sitting:

- `core`           environment, logging, and the one call to Gemini
- `dir_filter`     decide which directories in a clone are worth walking into
- `repo_index`     clone a repository and map it into a file tree
- `repo_evidence`  pick the files that matter for a task and quote them
- `repo_guide`     turn that evidence into an onboarding guide
- `issue_finder`   search for good first issues and plan one out
- `code_analyzer`  explain and security-review a pasted snippet
- `chat`           a programming assistant with a short memory

Only the last five serve routes. This file wires them together and does nothing
else; nothing here knows what any feature does.
"""

import os
from contextlib import asynccontextmanager

import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

import chat
import code_analyzer
import issue_finder
import repo_guide
import repo_index

CORS_ORIGINS = [
    "http://localhost:3000",
    "http://localhost:3001",
    "http://localhost:5173",
    "https://open-source-code-navigator.vercel.app",
    *[o.strip() for o in os.getenv("ALLOWED_ORIGINS", "").split(",") if o.strip()],
]


@asynccontextmanager
async def lifespan(_app: FastAPI):
    yield
    # Every repository we cloned lives in a temp directory; take them with us.
    repo_index.clear_cache()


app = FastAPI(title="Open-Source Code Navigator API", version="4.0.0", lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_origin_regex=r"https://open-source-code-navigator(-[a-z0-9-]+)?\.vercel\.app",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(repo_index.router)
app.include_router(repo_guide.router)
app.include_router(issue_finder.router)
app.include_router(code_analyzer.router)
app.include_router(chat.router)


@app.get("/")
async def root():
    return {"message": "API is running."}


if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
