"""Open-Source Code Navigator API.

Clones public GitHub repositories, serves their file trees, and uses Gemini to
explain code and generate contribution plans.
"""

import asyncio
import logging
import os
import re
import shutil
import tempfile
from contextlib import asynccontextmanager
from typing import List, Optional

import git
import google.generativeai as genai
import requests
import uvicorn
from dotenv import load_dotenv
from fastapi import FastAPI, Form, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

load_dotenv()
logging.basicConfig(level=os.getenv("LOG_LEVEL", "INFO").upper())
logger = logging.getLogger(__name__)


# --------------------------------------------------------------------------
# Configuration
# --------------------------------------------------------------------------
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY")
if not GEMINI_API_KEY:
    raise RuntimeError("GEMINI_API_KEY (or GOOGLE_API_KEY) is not set. AI features cannot run.")

GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")
genai.configure(api_key=GEMINI_API_KEY)

GENERATION_CONFIG = {
    "temperature": 0.4,
    "top_p": 0.95,
    "top_k": 40,
    # Gemini 2.5 spends part of the output budget on thinking, so a plan this
    # detailed needs more headroom than the visible text suggests.
    "max_output_tokens": int(os.getenv("MAX_OUTPUT_TOKENS", "16384")),
}

GITHUB_API = "https://api.github.com"

CORS_ORIGINS = [
    "http://localhost:3000",
    "http://localhost:3001",
    "http://localhost:5173",
    "https://open-source-code-navigator.vercel.app",
    *[o.strip() for o in os.getenv("ALLOWED_ORIGINS", "").split(",") if o.strip()],
]

# Directories that are generated, vendored, or otherwise noise in a file tree.
SKIP_TREE_DIRS = {
    ".git", ".cache", ".mypy_cache", ".next", ".pytest_cache", ".venv",
    "__pycache__", "build", "coverage", "dist", "node_modules", "target",
    "vendor", "venv",
}

# Cloning is CPU/network heavy, so only a couple may run at once.
CLONE_SEMAPHORE = asyncio.Semaphore(int(os.getenv("CLONE_CONCURRENCY", "2")))

# repo_url -> {"path": <temp dir>, "analysis": <RepoAnalysis payload>}
repo_cache: dict = {}


@asynccontextmanager
async def lifespan(_app: FastAPI):
    yield
    for entry in repo_cache.values():
        shutil.rmtree(entry["path"], ignore_errors=True)
    repo_cache.clear()


app = FastAPI(title="Open-Source Code Navigator API", version="4.0.0", lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_origin_regex=r"https://open-source-code-navigator(-[a-z0-9-]+)?\.vercel\.app",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# --------------------------------------------------------------------------
# Schemas
# --------------------------------------------------------------------------
class FileItem(BaseModel):
    name: str
    path: str
    type: str
    children: Optional[List["FileItem"]] = None


class RepoAnalysisResponse(BaseModel):
    name: str
    url: str
    structure: List[FileItem]


class Issue(BaseModel):
    id: int
    title: str
    url: str
    repoName: str
    labels: List[str]


class ContributionStep(BaseModel):
    step: int
    title: str
    details: str


class CodeExplanationResponse(BaseModel):
    is_correct: bool
    explanation: str
    corrected_code: Optional[str] = None


class GuidedContributionResponse(BaseModel):
    plan: List[ContributionStep]


class AnalyzeRepoRequest(BaseModel):
    repoUrl: str


class FindIssuesRequest(BaseModel):
    skills: str


class GuidedContributionRequest(BaseModel):
    repoUrl: str
    issueUrl: str
    issueTitle: str
    issueBody: str


class RepoGuideRequest(BaseModel):
    repoUrl: str


class ChatRequest(BaseModel):
    message: str


# --------------------------------------------------------------------------
# Gemini
# --------------------------------------------------------------------------
def generate(prompt: str, system_instruction: str) -> str:
    """Send a prompt to Gemini and return the generated text."""
    model = genai.GenerativeModel(
        model_name=GEMINI_MODEL,
        generation_config=GENERATION_CONFIG,
        system_instruction=system_instruction,
    )
    try:
        response = model.generate_content(prompt)
        text = (response.text or "").strip()
    except HTTPException:
        raise
    except Exception as exc:
        logger.error("Gemini request failed: %s", exc)
        raise HTTPException(500, f"Error calling Gemini API: {exc}") from exc

    if not text:
        # `response.text` is empty when every candidate was dropped, usually by a safety filter.
        reason = getattr(getattr(response, "prompt_feedback", None), "block_reason", None)
        raise HTTPException(502, f"Gemini returned an empty response (block_reason={reason}).")
    return text


# --------------------------------------------------------------------------
# GitHub
# --------------------------------------------------------------------------
def github_get(path: str, params: Optional[dict] = None, *, timeout: int = 25) -> dict:
    """GET a GitHub REST endpoint, translating failures into HTTP errors for the client."""
    headers = {
        "Accept": "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
    }
    token = os.getenv("GITHUB_TOKEN", "").strip()
    if token:
        headers["Authorization"] = f"Bearer {token}"

    try:
        response = requests.get(f"{GITHUB_API}{path}", params=params, headers=headers, timeout=timeout)
    except requests.Timeout as exc:
        raise HTTPException(504, "GitHub timed out. Try again in a moment.") from exc
    except requests.RequestException as exc:
        raise HTTPException(502, "Could not reach GitHub. Try again shortly.") from exc

    if response.status_code == 403:
        message = response.json().get("message", "GitHub API rate limit exceeded")
        raise HTTPException(
            429,
            f"{message}. Set GITHUB_TOKEN in the backend environment for higher limits "
            "(create one at https://github.com/settings/tokens).",
        )
    if response.status_code >= 400:
        message = response.json().get("message", response.text)
        raise HTTPException(502, f"GitHub request failed: {message}")
    return response.json()


def search_issues(skills: str, limit: int = 15) -> List[Issue]:
    """Find open `good first issue` tickets matching a comma-separated skill list."""
    terms = " ".join(part.strip() for part in skills.split(",") if part.strip())
    if not terms:
        raise HTTPException(400, "Please enter at least one skill to search for.")

    payload = github_get(
        "/search/issues",
        {
            "q": f'{terms} is:issue is:open label:"good first issue"',
            "sort": "created",
            "order": "desc",
            "per_page": limit,
        },
    )

    issues = []
    for item in payload.get("items", [])[:limit]:
        api_url = item.get("repository_url", "")
        issues.append(
            Issue(
                id=item["id"],
                title=item["title"],
                url=item["html_url"],
                repoName=api_url.split("/repos/", 1)[1] if "/repos/" in api_url else "unknown/repo",
                labels=[label["name"] for label in item.get("labels", [])],
            )
        )
    return issues


def fetch_issue_body(repo_full_name: str, issue_number: int) -> str:
    payload = github_get(f"/repos/{repo_full_name}/issues/{issue_number}", timeout=15)
    return payload.get("body") or "No description provided."


# --------------------------------------------------------------------------
# Repository indexing
# --------------------------------------------------------------------------
def build_file_tree(directory: str, repo_root: str, max_depth: int = 4, depth: int = 0) -> List[FileItem]:
    """Build a file tree with paths relative to the repository root."""
    if depth > max_depth:
        return []

    items: List[FileItem] = []
    try:
        names = os.listdir(directory)
    except OSError as exc:
        logger.warning("Could not read %s: %s", directory, exc)
        return []

    for name in names:
        if name in SKIP_TREE_DIRS:
            continue
        full_path = os.path.join(directory, name)
        relative_path = os.path.relpath(full_path, start=repo_root)
        is_directory = os.path.isdir(full_path)
        items.append(
            FileItem(
                name=name,
                path=relative_path,
                type="directory" if is_directory else "file",
                children=build_file_tree(full_path, repo_root, max_depth, depth + 1) if is_directory else [],
            )
        )

    items.sort(key=lambda item: (item.type != "directory", item.name))
    return items


def format_tree(items: List[FileItem], indent: str = "") -> str:
    lines = []
    for item in items:
        marker = "+-- " if item.type == "directory" else "|-- "
        # Send the path, not the bare name: the model is asked to cite files by their
        # full path, and it cannot do that reliably by counting indentation.
        lines.append(f"{indent}{marker}{item.path}")
        if item.children:
            lines.append(format_tree(item.children, indent + "    "))
    return "\n".join(line for line in lines if line)


async def index_repository(repo_url: str) -> dict:
    """Clone a repository into a temp directory and cache its file tree."""
    if not re.match(r"https://github\.com/[\w\-]+/[\w\-\.]+", repo_url):
        raise HTTPException(400, "Invalid GitHub repository URL format.")

    if repo_url in repo_cache:
        return repo_cache[repo_url]["analysis"]

    async with CLONE_SEMAPHORE:
        # Another request may have finished cloning while we waited for the slot.
        if repo_url in repo_cache:
            return repo_cache[repo_url]["analysis"]

        temp_dir = tempfile.mkdtemp()
        logger.info("Cloning %s", repo_url)
        try:
            git.Repo.clone_from(repo_url, temp_dir, depth=1)
            analysis = {
                "name": repo_url.rstrip("/").split("/")[-1].removesuffix(".git"),
                "url": repo_url,
                "structure": build_file_tree(temp_dir, temp_dir),
            }
        except Exception as exc:
            shutil.rmtree(temp_dir, ignore_errors=True)
            logger.error("Failed to analyze %s: %s", repo_url, exc)
            raise HTTPException(500, f"Failed to analyze repository: {exc}") from exc

        repo_cache[repo_url] = {"path": temp_dir, "analysis": analysis}
        return analysis


async def repo_tree_text(repo_url: str) -> str:
    """Return the cached file tree for a repo as prompt-friendly text, cloning if needed."""
    analysis = await index_repository(repo_url)
    return format_tree(analysis["structure"])


# --------------------------------------------------------------------------
# Contribution plans
# --------------------------------------------------------------------------
PLAN_SYSTEM_INSTRUCTION = (
    "You are a senior maintainer of the repository in front of you, writing the walkthrough "
    "you wish someone had written for you on your first day. You explain how the system "
    "actually works before you propose changing it, you reason from the evidence you were "
    "given rather than from how projects like this usually look, and you write code that "
    "could be pasted in and run. Vague advice is worse than none: you never tell a reader to "
    "'look into', 'investigate', or 'figure out' something you could have reasoned out "
    "yourself. Where the evidence genuinely does not settle a question, you commit to the "
    "most likely answer, say why you believe it, and give the one command that confirms it."
)

PLAN_FORMAT_RULES = """## Output rules (the application parses this)
1. Use the exact section headings below, each on its own line, wrapped in `**`. Never rename, reorder, skip, or add sections.
2. Depth beats coverage. Explain how the relevant part of the system works today - the flow, the functions involved, the data that moves between them - before proposing any change. The reader should finish this understanding the subsystem, not just holding a checklist.
3. Reason from the material above, not from convention. Name a file only if it appears in the structure, and use its full path from the repository root. If you are inferring that something exists or behaves a certain way, mark it as an assumption, state what it rests on, and give the single command that settles it.
4. Never hand the research back. "Investigate X", "check the docs", "verify the exact API", and "update this based on the patterns you find" are all failures - they leave the reader exactly where they started. Take a position instead.
5. Every code block must be complete and runnable as written: real imports, real symbol names, no `# implement this here` placeholders, no pseudocode, and matching the style visible in the project.
6. Every verification step must name the observable result - the exact output, exit code, or on-screen change that means it worked - plus the most likely failure and what it would mean.
7. The reader has the issue open already. Do not restate it; use the space to add what they cannot see for themselves.
8. Use Markdown bullets, numbered lists, and fenced code blocks with language tags. Length is fine when it carries information; filler is not."""


def parse_plan(response: str) -> List[ContributionStep]:
    """Split a Gemini plan into steps, falling back to one step holding the raw text."""
    sections = re.findall(
        r"\*\*Step \d+: (.+?)\*\*\n(.*?)(?=\n\*\*Step|\n\*\*Final|\Z)", response, re.DOTALL
    )
    plan = [
        ContributionStep(step=index + 1, title=title.strip(), details=details.strip())
        for index, (title, details) in enumerate(sections)
    ]

    final_advice = re.search(r"\*\*Final Advice\*\*\n(.*)", response, re.DOTALL)
    if final_advice:
        plan.append(
            ContributionStep(step=len(plan) + 1, title="Final Advice", details=final_advice.group(1).strip())
        )

    if not plan:
        logger.warning("Could not parse steps from the model response; returning it verbatim.")
        plan.append(ContributionStep(step=1, title="AI Response", details=response))
    return plan


# --------------------------------------------------------------------------
# Endpoints
# --------------------------------------------------------------------------
@app.get("/")
async def root():
    return {"message": "API is running."}


@app.post("/api/analyze/repo", response_model=RepoAnalysisResponse)
async def analyze_repo(request: AnalyzeRepoRequest):
    return await index_repository(request.repoUrl)


@app.get("/api/repo/file_content")
async def get_file_content(repo_url: str = Query(...), file_path: str = Query(...)):
    if repo_url not in repo_cache:
        raise HTTPException(404, "Repository not found or hasn't been analyzed yet.")

    repo_root = os.path.abspath(repo_cache[repo_url]["path"])
    full_path = os.path.abspath(os.path.join(repo_root, file_path))
    if os.path.commonpath([full_path, repo_root]) != repo_root:
        raise HTTPException(403, "File path is outside the repository bounds.")
    if not os.path.isfile(full_path):
        raise HTTPException(404, "File does not exist in the repository.")

    try:
        with open(full_path, "r", encoding="utf-8", errors="ignore") as handle:
            return {"content": handle.read()}
    except OSError as exc:
        logger.error("Could not read %s: %s", full_path, exc)
        raise HTTPException(500, "Could not read file content.") from exc


@app.post("/api/issues/find", response_model=List[Issue])
async def find_issues(request: FindIssuesRequest):
    return search_issues(request.skills)


@app.post("/api/contribute/guide", response_model=GuidedContributionResponse)
async def get_contribution_guide(request: GuidedContributionRequest):
    repo_match = re.search(r"github\.com/([\w\-]+/[\w\-]+)", request.repoUrl)
    issue_match = re.search(r"/issues/(\d+)", request.issueUrl)
    if not repo_match or not issue_match:
        raise HTTPException(400, "Invalid repository or issue URL.")

    issue_body = request.issueBody.strip() or fetch_issue_body(repo_match.group(1), int(issue_match.group(1)))
    tree = await repo_tree_text(request.repoUrl)

    prompt = f"""Write the contribution plan for the GitHub issue below.

Work out how this repository is put together from the structure given, then explain it
to the reader before you ask them to change anything. Assume they are a capable developer
who has never seen this codebase: they should be able to go from this plan to a merged
pull request without asking a single follow-up question, and without you sending them off
to research anything you could have worked out for them.

## Issue
- Repository: {request.repoUrl}
- Title: {request.issueTitle}
- Description:
\"\"\"
{issue_body}
\"\"\"

## Repository structure (partial)
```
{tree}
```

{PLAN_FORMAT_RULES}

## Required sections, in this order

**Step 1: What This Issue Really Asks For**
Translate the request into terms of this codebase: which subsystem owns the behaviour, and what the difference is between what the code does now and what the issue wants. Then give a 3-6 item definition of done, each item written as something that can be observed or run, not as an intention. Close with the decisions the issue leaves open - and your recommended answer to each, with the reasoning. Do not summarise the issue text.

**Step 2: How This Part of the Codebase Works Today**
The heart of the plan. Walk the reader through the existing machinery they are about to touch: the entry point, the path a request or a call takes through the files, the functions that matter and what each one is responsible for, and the shape of the data being passed around. Name the conventions this project follows that the contributor must imitate - how modules are organised, how errors are handled, how configuration reaches the code. Where the structure above is not enough to be certain, say what you infer and from which files you infer it. Someone who reads only this section should be able to find their way around unaided.

**Step 3: The Plan of Attack**
4-7 bullets in execution order. Each names the file it touches, the change in one sentence, and why it comes at that point in the sequence. Then: what must be installed or configured before starting, which parts of this change are most likely to go wrong in this particular codebase and how you would know, and one alternative approach with the reason you did not choose it.

**Step 4: Getting Set Up and Seeing the Problem**
Fork and clone commands, then the install and run commands this project actually uses - deduce them from the files present and say which file told you. Give the reader a way to observe the current behaviour with their own eyes before changing anything, and say what they should see. Finish by naming the first file to open and what to read in it.

**Step 5: Making the Change**
A numbered list of at least four actions. For each: **File** (full path), **What to change**, **Why** (which item of the definition of done it satisfies), **Snippet** (complete before/after or diff, in the project's own style), and **Verify** (the command to run and the exact result that means it worked). Order them so the code is in a working state as often as possible.

**Step 6: Proving It Works and Opening the PR**
The project's real test, lint, and type-check commands, inferred from its tooling files. Which test file to add or extend, following the naming and layout convention visible in the structure. The specific cases to cover: the behaviour the issue asked for, the edge cases you identified in Step 3, and a regression test that fails without this change. Then the PR description itself - what to write so a maintainer can review it quickly, including the "Fixes #N" line.

**Final Advice**
4-6 bullets, each one specific to this project or this change rather than generic contribution etiquette: the review conventions this repository appears to follow, where its maintainers discuss work, which part of this change is most likely to draw review comments and how to pre-empt it, and how to split the work into commits that tell a story."""

    logger.info("Generating contribution guide for: %s", request.issueTitle)
    return GuidedContributionResponse(plan=parse_plan(generate(prompt, PLAN_SYSTEM_INSTRUCTION)))


@app.post("/api/contribute/repo-guide", response_model=GuidedContributionResponse)
async def get_repo_contribution_guide(request: RepoGuideRequest):
    """Generate a general onboarding guide for a repository, with no issue required."""
    repo_match = re.search(r"github\.com/([\w\-\.]+/[\w\-\.]+)", request.repoUrl)
    if not repo_match:
        raise HTTPException(400, "Invalid repository URL.")

    tree = await repo_tree_text(request.repoUrl)

    prompt = f"""Write the onboarding and contribution guide for the repository below.

Work out how this repository is put together from the structure given. The reader has just
opened it for the first time and wants to understand it well enough to contribute: they
should come away knowing how the system fits together and where their first change belongs,
not just holding a list of commands.

## Repository
- URL: {request.repoUrl}
- Name: {repo_match.group(1)}

## Repository structure (partial)
```
{tree}
```

{PLAN_FORMAT_RULES}

## Required sections, in this order

**Step 1: What This Project Is**
What it does, who runs it, and the problem it exists to solve. Identify the stack from the files present and say which files told you. Then the part a newcomer cannot get from the README: how this project is shaped, which directories are the substance and which are scaffolding, and what the architecture implies about how the team works.

**Step 2: How the Code Fits Together**
The heart of the guide. Name the entry point and trace one complete path through the system in prose - what handles a request or a command first, what it calls, where the data comes from, and what comes back. Explain what each significant directory is responsible for and how it talks to the others. Point out the conventions a contributor must follow to have their code look like it belongs, and the places where the structure suggests something surprising is happening.

**Step 3: Getting It Running**
Fork and clone commands, then the install and run commands this project actually uses - deduce them from the files present and name the file each came from. Configuration and environment files to create, and what goes in them. What the reader should see once it is running. The two or three failures most likely on a fresh machine given this stack, and what each one means.

**Step 4: Your First Contribution**
Where this project's beginner-friendly work lives and how to recognise a good first issue here specifically. The branch-to-PR workflow step by step. Then a realistic worked example: pick a small change that would genuinely be useful in this repository, name the file, show the diff, and show how to verify it. Any PR and commit conventions the repository's own files imply.

**Step 5: Testing and Quality**
The real test, lint, type-check, and format commands, inferred from the tooling files present. Where tests live, what the naming convention is, and a minimal example test written in this project's own style. Which checks run automatically on a PR and what a contributor should run locally first to avoid a red build.

**Final Advice**
4-6 bullets specific to this project rather than generic contribution etiquette: where its maintainers talk, what this codebase's reviewers are likely to be picky about, which areas are safe for a newcomer and which are load-bearing, and the fastest way to build real familiarity with it."""

    logger.info("Generating repo contribution guide for: %s", request.repoUrl)
    return GuidedContributionResponse(plan=parse_plan(generate(prompt, PLAN_SYSTEM_INSTRUCTION)))


@app.post("/api/explain/code", response_model=CodeExplanationResponse)
async def explain_code(code: str = Form(...), context: str = Form("")):
    system_instruction = (
        "You are a senior software engineer and application-security reviewer. "
        "You explain code accurately for developers of all levels and flag real vulnerabilities, "
        "but you never invent issues that are not present in the snippet."
    )

    context_block = f"User-provided context:\n{context.strip()}\n\n" if context.strip() else ""
    prompt = f"""{context_block}Analyze the code below in two passes.

## Pass 1 - Explanation
Open with a one-sentence summary, then walk through the logic in order, referring to specific
functions, classes, and variables. Note inputs, outputs, side effects, and external dependencies.
Use Markdown formatting.

## Pass 2 - Security & correctness review
Look for genuine issues: injection (SQL, command, NoSQL), XSS, SSRF, path traversal, auth and
authorization mistakes, leaked secrets, insecure crypto, weak randomness, unsafe deserialization,
logic bugs, race conditions, unhandled errors, and insecure dependencies.

## Output format (strict - the application parses this)
If you found one or more genuine issues:
1. Write the explanation and the issue analysis, giving each finding a severity
   (Low / Medium / High / Critical) and a brief rationale.
2. Then write exactly `Corrected Code:` on its own line.
3. Immediately after it, output only the full corrected code in a single fenced block,
   with no commentary afterwards.

If the code is correct, provide only the explanation and never write the string `Corrected Code:`.
You may note "No security issues found." at the end.

Code:
```
{code}
```"""

    response = generate(prompt, system_instruction)
    if "Corrected Code:" not in response:
        return CodeExplanationResponse(is_correct=True, explanation=response)

    explanation, _, corrected = response.partition("Corrected Code:")
    corrected = re.sub(r"^```[a-zA-Z0-9_+\-]*\n?", "", corrected.strip())
    corrected = re.sub(r"```\s*$", "", corrected).strip()
    return CodeExplanationResponse(
        is_correct=False, explanation=explanation.strip(), corrected_code=corrected
    )


@app.post("/api/chat")
async def chat_with_ai(request: ChatRequest):
    system_instruction = (
        "You are 'Code Navigator', an AI pair-programmer that helps developers explore and "
        "contribute to open-source projects.\n"
        "- Be direct and technically accurate. Prefer short paragraphs and bullet lists.\n"
        "- Use fenced Markdown code blocks with language tags for code, commands, and paths.\n"
        "- When asked for code, give a minimal working example and explain the key parts.\n"
        "- Ask one focused clarifying question if the request is ambiguous.\n"
        "- Say so plainly when you do not know something; never fabricate APIs or commands."
    )
    return {"response": generate(f"User question:\n{request.message.strip()}\n\nAnswer:", system_instruction)}


if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
