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

### Backend (Google Cloud Run)

The backend runs as a container on [Cloud Run](https://cloud.google.com/run). The existing
`backend/Dockerfile` is used as-is; Cloud Run sets `PORT` automatically.

**One-time setup**

1. [Install the Google Cloud CLI](https://cloud.google.com/sdk/docs/install) and sign in:
   `gcloud auth login`
2. Create or pick a project, then:
   `gcloud config set project YOUR_PROJECT_ID`
3. Enable billing on the project (Cloud Run has a generous free tier).

**Deploy**

```bash
cd backend
export GEMINI_API_KEY=your_google_ai_studio_key   # required on first deploy
export GITHUB_TOKEN=your_github_pat               # optional but recommended
./deploy.sh
```

The script enables the required APIs, stores secrets in Secret Manager, grants Cloud Run
access to them, and deploys with settings suited to this app:

| Setting | Value | Why |
| --- | --- | --- |
| Memory | 2 GiB | Git clones and file reads |
| CPU | 2 | Faster indexing |
| Timeout | 900 s | Long Gemini contribution plans |
| Concurrency | 4 | Limits memory pressure per instance |

When it finishes, copy the service URL (e.g. `https://open-source-code-navigator-api-….run.app`).

**CI/CD (optional)** — push builds via Cloud Build:

```bash
cd backend
gcloud builds submit --config cloudbuild.yaml .
```

Create secrets `gemini-api-key` and `github-token` in Secret Manager first, or run
`./deploy.sh` once so the script creates them.

**Frontend** — on Vercel, set `REACT_APP_API_BASE` to your Cloud Run URL (no trailing slash)
and redeploy. CORS already allows the production Vercel domain; add others with the
`ALLOWED_ORIGINS` env var on the Cloud Run service.

**Notes**

- Cloned repositories live in memory and on the container filesystem; they are lost when an
  instance scales down or is replaced. That matches the current architecture.
- To update secrets later:
  `printf '%s' NEW_KEY | gcloud secrets versions add gemini-api-key --data-file=-`
  then redeploy or restart revisions.

### Backend (Render)

Runtime `Docker`, Root Directory `backend`, Dockerfile `Dockerfile`. The
Dockerfile pins Python 3.12, which avoids Render's default 3.14 breaking `pydantic-core`. Set
`GEMINI_API_KEY` and `GITHUB_TOKEN`. If you deploy with the native Python runtime instead, also set
`PYTHON_VERSION=3.12.8` and clear the build cache after changing it.

### Frontend (Vercel)

Root Directory `frontend`, Install `npm install --legacy-peer-deps`,
Build `npm run build`, Output `build`. Set `REACT_APP_API_BASE` to your backend URL (Cloud Run or
Render) with no trailing slash. CORS already allows the production Vercel domain and its preview
URLs; add any others via the `ALLOWED_ORIGINS` environment variable on the backend.

## Team

- [Aadi Patodia](https://github.com/aadipatodia)
- [Bhoomika Singh](https://github.com/Bhoomikaaa001)
- [Ansh Chauhan](https://github.com/Ansh0864)
