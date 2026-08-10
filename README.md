# Open-Source Code Navigator

An AI-powered tool for exploring and contributing to open-source projects. Paste a GitHub URL to
browse a repository, find beginner-friendly issues, get code explained and security-reviewed, and
generate step-by-step contribution plans — all powered by Google **Gemini 2.5 Flash**.

**Demo video** — https://www.youtube.com/watch?v=5CUmaxyhFXU

## Features

- **Repository explorer** — clone any public GitHub repo and browse its file tree next to a syntax-highlighted viewer.
- **Issue finder** — search GitHub for open `good first issue` tickets matching your skills.
- **Contribution plans** — pick an issue (or a whole repo) and Gemini writes a detailed, file-aware plan.
- **Code analysis** — paste a snippet to get a walkthrough, a security review, and a corrected version.
- **AI chat** — a Gemini-backed pair-programmer for any open-source question.

## Architecture

```
backend/          FastAPI service (main.py) — GitHub API, git cloning, and all Gemini calls
frontend/         React + TypeScript single-page app (MUI)
  src/components/ Reusable UI + one file per page
  src/context/    AuthContext (Firebase) and AppDataContext (shared app state)
  src/config/     Axios client and API error handling
  src/types.ts    Shared TypeScript types
```

The frontend keeps all server state in `AppDataContext` and talks to the backend through a single
axios client. The backend keeps cloned repositories in an in-memory cache keyed by repo URL, and
deletes the temporary clones on shutdown.

### API

| Method | Endpoint | Purpose |
| --- | --- | --- |
| `POST` | `/api/analyze/repo` | Clone a repo and return its file tree |
| `GET` | `/api/repo/file_content` | Read one file from a cloned repo |
| `POST` | `/api/issues/find` | Search GitHub for good-first issues |
| `POST` | `/api/contribute/guide` | Contribution plan for a specific issue |
| `POST` | `/api/contribute/repo-guide` | Onboarding guide for a whole repo |
| `POST` | `/api/explain/code` | Explain and security-review a snippet |
| `POST` | `/api/chat` | Free-form chat |

## Setup

### Prerequisites

- Node.js 16+, Python 3.12, and Git
- A [Google AI Studio API key](https://aistudio.google.com/app/apikey) (the free tier works)

### Backend

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate          # Windows: .\.venv\Scripts\Activate
pip install -r requirements.txt
cp .env.example .env               # then fill in GEMINI_API_KEY
python main.py                     # serves on http://localhost:8000
```

`GEMINI_API_KEY` is required. `GITHUB_TOKEN` is strongly recommended — without one, GitHub's
anonymous API limit (60 requests/hour per IP) will make issue search fail intermittently.

### Frontend

```bash
cd frontend
npm install --legacy-peer-deps     # one dependency still pins react <= 18 as a peer
npm start                          # serves on http://localhost:3000
```

Sign-in uses Firebase Authentication (email/password or Google). Configure your Firebase project in
`src/firebaseConfig.ts`.

## Deployment

**Backend (Render)** — Runtime `Docker`, Root Directory `backend`, Dockerfile `Dockerfile`. The
Dockerfile pins Python 3.12, which avoids Render's default 3.14 breaking `pydantic-core`. Set
`GEMINI_API_KEY` and `GITHUB_TOKEN`. If you deploy with the native Python runtime instead, also set
`PYTHON_VERSION=3.12.8` and clear the build cache after changing it.

**Frontend (Vercel)** — Root Directory `frontend`, Install `npm install --legacy-peer-deps`,
Build `npm run build`, Output `build`. Set `REACT_APP_API_BASE` to your Render URL with no trailing
slash. CORS already allows the production Vercel domain and its preview URLs; add any others via the
`ALLOWED_ORIGINS` environment variable.

## Team

- [Aadi Patodia](https://github.com/aadipatodia)
- [Bhoomika Singh](https://github.com/Bhoomikaaa001)
- [Ansh Chauhan](https://github.com/Ansh0864)
