# Open-Source Code Navigator

An intelligent tool designed to help developers navigate, understand, and contribute to open-source projects. Powered by Google **Gemini 2.5 Flash**, this app provides AI-driven code explanations, issue discovery, and step-by-step contribution guides — all with **zero login or tokens** required.

## Table of Contents
- [Key Features](#key-features)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Setup and Installation](#setup-and-installation)
  - [Prerequisites](#prerequisites)
  - [Gemini API Setup](#gemini-api-setup)
  - [Backend Setup](#backend-setup)
  - [Frontend Setup](#frontend-setup)
- [Running the Application](#running-the-application)


## Key Features

- **No login required** — open the app and you're in. No accounts, no tokens, no Descope.
- **GitHub Repository Analysis** — paste any public GitHub URL to clone it and get an interactive file tree.
- **AI-Powered Code Explanation** — open any file from the tree and get a structured AI walkthrough.
- **Security & Error Review** — the analyzer flags vulnerabilities, explains them, and suggests a corrected version.
- **Intelligent Issue Finder** — searches GitHub for `good first issue`-labeled tickets that match your skills.
- **AI-Guided Contributions** — pick an issue and Gemini produces a step-by-step contribution plan.
- **Interactive AI Chat** — a Gemini-powered pair-programmer for any open-source question.


## Tech Stack

### FastAPI (Backend)
A FastAPI service that:
- Exposes a small REST API the frontend consumes (analyze repo, find issues, explain code, generate contribution plan, chat).
- Talks to GitHub's public API anonymously (no token required) for issue search and repo metadata.
- Talks to Gemini via the official `google-generativeai` SDK for every AI feature.

### React (Frontend)
A single-page React + TypeScript app with MUI:
- Sidebar navigation across Home / Explore / Issues / Analyze / Chat.
- Markdown-rendered AI output with syntax-highlighted code blocks.
- No authentication layer — everything is local and instant.

### Google Gemini 2.5 Flash
- Powers code explanation, security review, contribution planning, and chat.
- Default model is `gemini-2.5-flash`, configurable via `GEMINI_MODEL`.


## Project Structure
```
CODE-NAVIGATOR/
├── backend/
│   ├── .env                # Backend environment (only GEMINI_API_KEY needed)
│   ├── main.py             # FastAPI application entry point
│   ├── test_gemini.py      # Smoke test for the Gemini integration
│   └── requirements.txt    # Python dependencies
│
└── frontend/
    ├── public/             # Static assets
    ├── src/
    │   ├── components/     # React components & pages
    │   ├── context/        # AppDataContext (shared state)
    │   ├── theme/          # MUI theme
    │   └── App.tsx         # Root component
    └── package.json        # Node.js dependencies
```


## Setup and Installation

### Prerequisites
- [Node.js](https://nodejs.org/) v16 or later
- [Python](https://www.python.org/) v3.9 or later
- [Git](https://git-scm.com/)
- A Google AI Studio API key (free tier works) — https://aistudio.google.com/app/apikey

### Gemini API Setup
1. Sign in to [Google AI Studio](https://aistudio.google.com/app/apikey).
2. Click **Create API key** and copy the key.
3. Put it in `backend/.env` as `GEMINI_API_KEY` (see below).

That's the **only** secret the app needs.

### Backend Setup
```bash
git clone https://github.com/aadipatodia/Open-Source-Code-Navigator.git
cd Open-Source-Code-Navigator/backend

# Create a virtual environment
python3 -m venv .venv
source .venv/bin/activate            # macOS / Linux
# .\.venv\Scripts\Activate            # Windows PowerShell

# Install dependencies
pip install -r requirements.txt
```

Create `backend/.env`:

```env
GEMINI_API_KEY="YOUR_GOOGLE_AI_STUDIO_API_KEY"
# Optional — override the default model:
# GEMINI_MODEL="gemini-2.5-flash"
```

(Optional) Verify the Gemini connection:

```bash
python test_gemini.py
```

### Frontend Setup
```bash
cd ../frontend
npm install --legacy-peer-deps   # one of the deps still pins react <=18 as a peer
```

No frontend `.env` is needed.


## Running the Application
Two terminals.

### Terminal 1 — Backend
```bash
cd backend
source .venv/bin/activate    # or .\.venv\Scripts\Activate on Windows
python main.py
```

### Terminal 2 — Frontend
```bash
cd frontend
npm start
```

Then open [http://localhost:3000](http://localhost:3000).

---

**Note on rate limits:** Because the backend now calls GitHub's API anonymously (60 req/hr per IP), heavy issue searching may hit the limit. For casual exploration this is plenty.

**Demo Video** — https://www.youtube.com/watch?v=5CUmaxyhFXU&feature=youtu.be

## Team Members
1. Aadi Patodia https://github.com/aadipatodia
2. Bhoomika Singh https://github.com/Bhoomikaaa001
3. Ansh Chauhan https://github.com/Ansh0864
