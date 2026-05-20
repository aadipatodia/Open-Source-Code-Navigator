from fastapi import FastAPI, HTTPException, Form, Query
from fastapi.middleware.cors import CORSMiddleware
from typing import Optional, List
import os
from dotenv import load_dotenv
import logging
import tempfile
import shutil
import stat
from pydantic import BaseModel
from github import Github, GithubException
import git
import re
import uvicorn
import google.generativeai as genai
import requests

# --- Basic Configuration ---
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)
load_dotenv()

app = FastAPI(title="Open-Source On-Ramp API", version="4.0.0")

# --- CORS Configuration ---
_default_origins = [
    "http://localhost:3000",
    "http://localhost:5173",
    "http://localhost:3001",
    "https://open-source-code-navigator.vercel.app",
]
_extra_origins = [
    o.strip()
    for o in os.getenv("ALLOWED_ORIGINS", "").split(",")
    if o.strip()
]
app.add_middleware(
    CORSMiddleware,
    allow_origins=_default_origins + _extra_origins,
    allow_origin_regex=r"https://open-source-code-navigator(-[a-z0-9-]+)?\.vercel\.app",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Environment & API Configuration ---
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY")
GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")

if not GEMINI_API_KEY:
    logger.error("FATAL: GEMINI_API_KEY (or GOOGLE_API_KEY) not found in .env file. AI features will not work.")
    raise RuntimeError("Gemini API key not configured")

_github_token = os.getenv("GITHUB_TOKEN", "").strip()
if _github_token:
    logger.info("GITHUB_TOKEN is set — GitHub API rate limits are increased.")
else:
    logger.warning(
        "GITHUB_TOKEN is not set — anonymous GitHub API limits apply (issue search may fail on Render). "
        "Add a token at https://github.com/settings/tokens"
    )

genai.configure(api_key=GEMINI_API_KEY)

# Reasonable default generation settings tuned for code-explanation / planning tasks.
GEMINI_GENERATION_CONFIG = {
    "temperature": 0.4,
    "top_p": 0.95,
    "top_k": 40,
    "max_output_tokens": 8192,
}

gemini_model = genai.GenerativeModel(
    model_name=GEMINI_MODEL,
    generation_config=GEMINI_GENERATION_CONFIG,
)

logger.info("Using anonymous GitHub client (no token required).")

# --- Pydantic Models ---
class FileItem(BaseModel):
    name: str
    path: str
    type: str
    children: Optional[List['FileItem']] = None
    
class CodeExplanationResponse(BaseModel):
    is_correct: bool
    explanation: str
    corrected_code: Optional[str] = None

class AnalyzeRepoRequest(BaseModel):
    repoUrl: str

class RepoAnalysisResponse(BaseModel):
    name: str
    url: str
    structure: List[FileItem]

class FindIssuesRequest(BaseModel):
    skills: str

class Issue(BaseModel):
    id: int
    title: str
    url: str
    repoName: str
    labels: List[str]

class GuidedContributionRequest(BaseModel):
    repoUrl: str
    issueUrl: str
    issueTitle: str
    issueBody: str # Added issueBody to the request

class ContributionStep(BaseModel):
    step: int
    title: str
    details: str

class GuidedContributionResponse(BaseModel):
    plan: List[ContributionStep]
    
class ChatRequest(BaseModel):
    message: str

# In-memory cache for cloned repository paths
repo_cache = {}

# --- Utility Functions ---
def handle_remove_readonly(func, path, exc_info):
    if not isinstance(exc_info[1], PermissionError):
        raise
    logger.debug(f"Fixing permissions for {path}")
    os.chmod(path, stat.S_IWRITE)
    func(path)

def get_github_client() -> Github:
    """GitHub client — uses GITHUB_TOKEN when set (recommended for production)."""
    token = os.getenv("GITHUB_TOKEN", "").strip()
    return Github(login_or_token=token) if token else Github()


def _repo_name_from_api_url(repository_url: str) -> str:
    marker = "/repos/"
    if marker in repository_url:
        return repository_url.split(marker, 1)[1]
    return "unknown/repo"


def search_github_issues(skills: str, *, limit: int = 15, timeout: int = 25) -> List[Issue]:
    """Search GitHub for good-first issues with a hard HTTP timeout."""
    skills_query = " ".join(part.strip() for part in skills.split(",") if part.strip())
    if not skills_query:
        raise HTTPException(status_code=400, detail="Please enter at least one skill to search for.")

    query = f'{skills_query} is:issue is:open label:"good first issue"'
    headers = {
        "Accept": "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
    }
    token = os.getenv("GITHUB_TOKEN", "").strip()
    if token:
        headers["Authorization"] = f"Bearer {token}"

    logger.info(
        "GitHub issue search (single REST call, authenticated=%s): %s",
        bool(token),
        query,
    )

    try:
        response = requests.get(
            "https://api.github.com/search/issues",
            params={"q": query, "sort": "created", "order": "desc", "per_page": limit},
            headers=headers,
            timeout=timeout,
        )
    except requests.Timeout as exc:
        logger.error(f"GitHub search timed out after {timeout}s: {exc}")
        raise HTTPException(
            status_code=504,
            detail="GitHub search timed out. Try again in a moment.",
        ) from exc
    except requests.RequestException as exc:
        logger.error(f"GitHub search request failed: {exc}")
        raise HTTPException(
            status_code=502,
            detail="Could not reach GitHub. Try again shortly.",
        ) from exc

    if response.status_code == 403:
        message = response.json().get("message", "GitHub API rate limit exceeded")
        logger.error(f"GitHub search forbidden: {message}")
        raise HTTPException(
            status_code=429,
            detail=(
                f"{message}. Add a GITHUB_TOKEN in Render environment variables "
                "for higher limits (create at https://github.com/settings/tokens)."
            ),
        )

    if response.status_code >= 400:
        message = response.json().get("message", response.text)
        logger.error(f"GitHub search failed ({response.status_code}): {message}")
        raise HTTPException(
            status_code=502,
            detail=f"GitHub search failed: {message}",
        )

    items = response.json().get("items", [])
    logger.info("GitHub search returned %d issues", len(items))
    return [
        Issue(
            id=item["id"],
            title=item["title"],
            url=item["html_url"],
            repoName=_repo_name_from_api_url(item.get("repository_url", "")),
            labels=[label["name"] for label in item.get("labels", [])],
        )
        for item in items[:limit]
    ]

def generate_with_gemini(prompt: str, system_instruction: Optional[str] = None) -> str:
    """Send a prompt to Gemini 2.5 Flash and return the generated text.

    A `system_instruction` can be provided to set a persistent role for the model
    on a per-call basis; otherwise the default model configuration is used.
    """
    try:
        model = (
            genai.GenerativeModel(
                model_name=GEMINI_MODEL,
                generation_config=GEMINI_GENERATION_CONFIG,
                system_instruction=system_instruction,
            )
            if system_instruction
            else gemini_model
        )
        response = model.generate_content(prompt)

        # `response.text` raises if the model returned no candidates (e.g. blocked
        # by safety filters), so guard the access explicitly.
        text = None
        try:
            text = response.text
        except Exception as text_exc:
            logger.error(f"Gemini response had no text: {text_exc}")

        if not text:
            block_reason = None
            try:
                block_reason = response.prompt_feedback.block_reason  # type: ignore[attr-defined]
            except Exception:
                pass
            logger.error(f"Gemini returned no text. block_reason={block_reason}")
            raise HTTPException(
                status_code=502,
                detail=f"Gemini returned an empty response (block_reason={block_reason}).",
            )
        return text.strip()
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Gemini API error: {e}")
        raise HTTPException(status_code=500, detail=f"Error calling Gemini API: {e}")

def build_file_tree(root_dir: str, start_dir: str, max_depth=4, depth=0) -> List[FileItem]:
    """Recursively builds a file tree structure, calculating paths relative to start_dir."""
    logger.debug(f"Building file tree for {root_dir}, depth {depth}")
    if depth > max_depth:
        logger.debug(f"Reached max depth {max_depth} at {root_dir}")
        return []
    items = []
    try:
        for item_name in os.listdir(root_dir):
            if item_name == '.git':
                continue
            full_path = os.path.join(root_dir, item_name)
            # Paths should be relative to the actual start of the repo, not the parent temp dir
            relative_path = os.path.relpath(full_path, start=start_dir) 
            logger.debug(f"Processing item: {full_path}, relative_path: {relative_path}")
            
            if os.path.isdir(full_path):
                # Recursive call for directories
                children = build_file_tree(full_path, start_dir, max_depth, depth + 1)
                items.append(FileItem(
                    name=item_name,
                    path=relative_path,
                    type='directory',
                    children=children
                ))
            else:
                items.append(FileItem(
                    name=item_name,
                    path=relative_path,
                    type='file',
                    children=[]
                ))
        items.sort(key=lambda x: (x.type != 'directory', x.name))
        logger.debug(f"Generated {len(items)} items for {root_dir}")
        return items
    except Exception as e:
        logger.error(f"Error building file tree at {root_dir}: {e}")
        return []

def format_file_tree_for_prompt(items: List[FileItem], indent: str = "") -> str:
    tree_str = ""
    for item in items:
        tree_str += f"{indent}{'+-- ' if item.type == 'directory' else '|-- '}{item.name}\n"
        if item.children:
            tree_str += format_file_tree_for_prompt(item.children, indent + "    ")
    return tree_str

# --- API Endpoints ---
@app.post("/api/analyze/repo", response_model=RepoAnalysisResponse)
async def analyze_repo(request: AnalyzeRepoRequest):
    repo_url = request.repoUrl
    logger.debug(f"Received analyze request for: {repo_url}")
    if not re.match(r"https://github\.com/[\w\-]+/[\w\-\.]+", repo_url):
        logger.error(f"Invalid GitHub repository URL format: {repo_url}")
        raise HTTPException(status_code=400, detail="Invalid GitHub repository URL format.")

    if repo_url in repo_cache:
        logger.info(f"Using cached repository from {repo_cache[repo_url]['path']}")
        return repo_cache[repo_url]['analysis']

    temp_dir = tempfile.mkdtemp()
    logger.info(f"Cloning {repo_url} into {temp_dir}...")
    try:
        # The git clone command places the repository's contents directly into the temp_dir
        git.Repo.clone_from(repo_url, temp_dir, depth=1)
        logger.debug(f"Repository raw clone to {temp_dir}")
        
        repo_root_path = temp_dir
        repo_name = repo_url.split('/')[-1].replace('.git', '')
        logger.debug(f"Identified repo_root_path: {repo_root_path}")

        file_structure = build_file_tree(repo_root_path, start_dir=repo_root_path)
        logger.debug(f"File structure generated with {len(file_structure)} items")

        analysis_result = {"name": repo_name, "url": repo_url, "structure": file_structure}
        repo_cache[repo_url] = {"path": repo_root_path, "analysis": analysis_result}
        
        logger.info(f"Repository analysis completed for {repo_url}")
        return analysis_result
    except Exception as e:
        logger.error(f"Failed during repo analysis {repo_url}: {e}")
        shutil.rmtree(temp_dir, onerror=handle_remove_readonly)
        raise HTTPException(status_code=500, detail=f"Failed to analyze repository: {e}")
    
@app.get("/tools")
async def get_tools():
    try:
        with open("tools.json", "r") as f:
            import json as _json
            return _json.load(f)
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail="tools.json not found")

@app.on_event("shutdown")
async def cleanup():
    for repo in repo_cache.values():
        shutil.rmtree(repo["path"], onerror=handle_remove_readonly)
    repo_cache.clear()
    
@app.post("/api/summarize-code")
async def summarize_code(code: str = Form(...), context: str = Form("")):
    logger.debug("Summarizing code snippet")

    system_instruction = (
        "You are a senior software engineer doing a quick code review for a teammate. "
        "Your summaries are precise, high-signal, and never restate code line by line."
    )

    context_block = f"Additional context provided by the user:\n{context.strip()}\n\n" if context.strip() else ""

    prompt = f"""{context_block}Summarize the code below for a developer who has never seen it before.

Respond in Markdown using exactly this structure:

**One-line summary**
A single sentence describing what this code does at a high level.

**Key responsibilities**
- 3 to 6 short bullets covering the most important behaviors, inputs/outputs, and notable algorithms or patterns.

**Dependencies & side effects**
- Note external libraries, network/filesystem/database access, mutated globals, or other side effects. Write "None observed." if nothing notable.

**Potential concerns**
- List likely bugs, performance issues, security risks, or unclear logic. Write "None observed." if nothing stands out.

Constraints:
- Stay under ~200 words total.
- Do not invent functionality that is not visible in the code.
- Use the exact section headings shown above.

Code:
```
{code}
```"""

    summary = generate_with_gemini(prompt, system_instruction=system_instruction)
    logger.debug("Code summary generated")
    return {"summary": summary}

@app.post("/api/contribute/guide", response_model=GuidedContributionResponse)
async def get_contribution_guide(request: GuidedContributionRequest):
    logger.debug(f"Generating contribution guide for issue: {request.issueTitle}")
    g = get_github_client()
    repo_name_match = re.search(r"github\.com/([\w\-]+/[\w\-]+)", request.repoUrl)
    issue_number_match = re.search(r"/issues/(\d+)", request.issueUrl)

    if not repo_name_match or not issue_number_match:
        logger.error(f"Invalid repository or issue URL: {request.repoUrl}, {request.issueUrl}")
        raise HTTPException(status_code=400, detail="Invalid repository or issue URL.")

    repo_full_name = repo_name_match.group(1)
    issue_number = int(issue_number_match.group(1))

    # If the caller already passed an issueBody, trust it; otherwise fetch via the
    # GitHub API (anonymous calls are fine for public repos, subject to rate limits).
    issue_body = (request.issueBody or "").strip()
    if not issue_body:
        try:
            repo = g.get_repo(repo_full_name)
            issue = repo.get_issue(number=issue_number)
            issue_body = issue.body or "No description provided."
            logger.debug(f"Fetched issue {issue_number} from {repo_full_name}")
        except GithubException as e:
            message = e.data.get('message') if hasattr(e, 'data') and isinstance(e.data, dict) else str(e)
            logger.error(f"GitHub API error: {message}")
            raise HTTPException(status_code=404, detail=f"Could not fetch issue details from GitHub: {message}")

    if request.repoUrl not in repo_cache:
        logger.debug(f"Repository {request.repoUrl} not in cache, analyzing...")
        analyze_request = AnalyzeRepoRequest(repoUrl=request.repoUrl)
        await analyze_repo(analyze_request)

    
    analysis = repo_cache[request.repoUrl]['analysis']
    file_tree_string = format_file_tree_for_prompt(analysis['structure'])

    # --- Contribution guide prompt ---
    system_instruction = (
        "You are a senior open-source maintainer mentoring a first-time contributor. "
        "You write thorough, file-aware, technically-precise contribution plans that a beginner "
        "can follow end-to-end without getting stuck. You prefer concrete code, exact commands, "
        "and named files/functions over vague advice. You never fabricate files, functions, "
        "or APIs that are not supported by the provided repository context — when uncertain, "
        "you say so explicitly and explain how the contributor can confirm."
    )

    prompt = f"""You will produce a DETAILED, end-to-end contribution plan for the GitHub issue below.
Aim for a plan that a motivated beginner can follow without needing to ask follow-up questions.

## Issue
- Repository: {request.repoUrl}
- Title: {request.issueTitle}
- Description:
\"\"\"
{issue_body}
\"\"\"

## Repository file structure (partial)
```
{file_tree_string}
```

## Output rules (read carefully — the application parses this output)
1. Use the EXACT section headings below, each on its own line, surrounded by `**`. The downstream parser depends on this format.
2. Do not invent files that are not in the structure above; if you are unsure, say "likely located in ..." and describe how to confirm (e.g., `grep -R "symbol" .`).
3. Prefer concrete, actionable instructions ("Open `src/foo.ts` and update the `bar` function to ...") over vague advice ("look around the codebase").
4. Use Markdown bullets, numbered lists, and fenced code blocks (with language tags) for commands, diffs, and snippets.
5. Be GENEROUS with detail. Each step (other than Step 1) should be MULTI-PARAGRAPH and include explicit commands, file paths, function/class names, and rationale.
6. Where a code change is involved, show a realistic snippet (before/after, or a minimal diff). It does not need to be perfect — annotate any assumptions with "ASSUMPTION: ...".
7. Anticipate common beginner pitfalls and call them out inline ("Heads up: ...").
8. Do NOT add sections beyond the ones listed; do NOT use Step 6+. Put everything else inside the existing sections.

## Required sections (in this order, with this depth)

**Step 1: Understand the Problem**
- Restate the issue in plain language: what is broken / missing / desired, and for whom.
- Identify the affected user flow or subsystem.
- Define a precise "definition of done" / acceptance criteria checklist (3–6 items) for a successful PR.
- Note any open questions a maintainer might need to clarify before coding.

**Step 2: High-Level Roadmap**
- Describe the overall approach in 4–7 detailed bullets, in execution order.
- For each bullet, name the most likely files / directories to touch (referencing the structure above) and the role each plays.
- Diagram the data/control flow in prose if it helps ("Request hits `X`, which calls `Y`, which reads from `Z`...").
- List prerequisites: required tooling versions, env vars, accounts, OS notes, and how to install them.
- Call out risks, edge cases, and alternative approaches considered.

**Step 3: Detailed Implementation - First Action**
- Walk through the very first concrete actions step-by-step:
  1. Fork + clone commands (with exact `git` commands).
  2. Install / bootstrap commands (e.g., `npm install`, `pip install -r requirements.txt`, `make setup`) — pick the right one based on the file tree.
  3. How to run the project locally and reproduce the bug or current behavior (commands + URL/port if applicable).
  4. Which file to open first and what to read inside it to build a mental model.
- Include a starter code edit or scaffold with a fenced code block when useful.

**Step 4: Detailed Implementation - Next Steps**
- Provide an ordered, NUMBERED list of follow-up actions to fully implement the fix/feature.
- For each numbered action, include ALL of the following sub-bullets:
  - **File**: exact path from the tree.
  - **What to change**: function/class/section to modify or add.
  - **Why**: how this advances the acceptance criteria.
  - **Snippet**: a short fenced code block showing the change (before → after, or a diff). Mark assumptions clearly.
  - **Verify**: how to confirm this step worked (run a command, check a UI element, run a test).
- Include at least 4 numbered actions. More is better if the issue warrants it.

**Step 5: Testing the Changes**
- Describe how to verify the fix locally end-to-end.
- List specific commands: unit tests, integration tests, linters, type checks, manual UI checks, or CLI smoke tests. Use the project's actual tooling where it is visible in the file tree.
- Explain how to add or update tests: which test file to touch, what cases to cover (happy path, edge cases, regression for the original bug).
- Describe how to write a clear PR description and link the issue ("Fixes #N").

**Final Advice**
- 4–6 substantive bullets covering: opening a draft PR early, keeping commits focused, following the project's contribution guide / code style, responding to review feedback, and where to ask for help (Discussions, Discord, issue thread).

Stay strictly within this format — the application parses it programmatically. Use Markdown freely INSIDE each section, but do not rename or skip section headings."""

    logger.info(f"Generating contribution guide for issue: {request.issueTitle}")
    ai_response = generate_with_gemini(prompt, system_instruction=system_instruction)
    
    plan = []
    # Use a more robust regex to handle variations in the AI's output
    steps_raw = re.findall(r"\*\*Step \d+: (.+?)\*\*\n(.*?)(?=\n\*\*Step|\Z)", ai_response, re.DOTALL)
    
    for i, (title, details) in enumerate(steps_raw):
        plan.append(ContributionStep(
            step=i + 1,
            title=title.strip(),
            details=details.strip()
        ))

    if not plan:
        logger.warning("No structured steps parsed from AI response, using fallback.")
        plan.append(ContributionStep(step=1, title="AI Response", details=ai_response))

    logger.debug(f"Contribution guide generated with {len(plan)} steps")
    return GuidedContributionResponse(plan=plan)


@app.post("/api/chat")
async def chat_with_ai(request: ChatRequest):
    """
    Handles a chat message, sending it to the AI for a response.
    """
    logger.debug(f"Received chat message: {request.message}")

    system_instruction = (
        "You are 'Code Navigator', an AI pair-programmer that helps developers explore "
        "and contribute to open-source projects.\n"
        "Style guidelines:\n"
        "- Be direct, technically accurate, and concise. Prefer short paragraphs and bullet lists.\n"
        "- Use fenced Markdown code blocks with language tags for any code, commands, or paths.\n"
        "- If the user asks for code, give a minimal working example and briefly explain the key parts.\n"
        "- If a question is ambiguous, ask one focused clarifying question before answering.\n"
        "- If you do not know something, say so plainly — do not fabricate APIs, files, or commands.\n"
        "- Never include private chain-of-thought; output only the final answer."
    )

    prompt = f"User question:\n{request.message.strip()}\n\nAnswer:"

    try:
        ai_response = generate_with_gemini(prompt, system_instruction=system_instruction)
        logger.debug("AI response generated successfully.")
        return {"response": ai_response}
    except HTTPException as e:
        logger.error(f"Error during AI chat response: {e.detail}")
        raise e
    except Exception as e:
        logger.error(f"Unexpected error during AI chat response: {e}")
        raise HTTPException(status_code=500, detail="Failed to get a response from the AI.")

@app.get("/api/repo/file_content")
async def get_file_content(repo_url: str = Query(...), file_path: str = Query(...)):
    logger.debug(f"Fetching file content for {repo_url}, path: {file_path}")
    if repo_url not in repo_cache:
        logger.error(f"Repository {repo_url} not found in cache")
        raise HTTPException(status_code=404, detail="Repository not found or hasn't been analyzed yet.")
    
    repo_root = repo_cache[repo_url]["path"] 
    
    full_file_path = os.path.abspath(os.path.join(repo_root, file_path))
    
    if not full_file_path.startswith(os.path.abspath(repo_root)):
        logger.error(f"File path {full_file_path} is outside repository bounds")
        raise HTTPException(status_code=403, detail="File path is outside the repository bounds.")

    if not os.path.exists(full_file_path) or not os.path.isfile(full_file_path):
        logger.error(f"File {full_file_path} does not exist or is not a file")
        raise HTTPException(status_code=404, detail="File does not exist in the repository.")
        
    try:
        with open(full_file_path, 'r', encoding='utf-8', errors='ignore') as f:
            content = f.read()
        logger.debug(f"Successfully read file content from {full_file_path}")
        return {"content": content}
    except Exception as e:
        logger.error(f"Error reading file {full_file_path}: {e}")
        raise HTTPException(status_code=500, detail="Could not read file content.")

@app.post("/api/issues/find", response_model=List[Issue])
async def find_issues(request: FindIssuesRequest):
    logger.debug(f"Searching issues with skills: {request.skills}")
    try:
        results = search_github_issues(request.skills)
        logger.info(f"Found {len(results)} issues for skills: {request.skills}")
        return results
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Unexpected error searching issues: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to find issues: {e}")

@app.post("/api/explain/code", response_model=CodeExplanationResponse)
async def explain_code(code: str = Form(...), context: str = Form("")):
    logger.debug("Analyzing and explaining code snippet")

    system_instruction = (
        "You are a senior software engineer and application-security reviewer. "
        "You explain code accurately for developers of all levels and flag real vulnerabilities — "
        "but you never invent issues that are not actually present in the snippet."
    )

    context_block = f"User-provided context:\n{context.strip()}\n\n" if context.strip() else ""

    prompt = f"""{context_block}Analyze the code below in two passes.

## Pass 1 — Explanation
Write a clear, step-by-step walkthrough of what the code does:
- Start with a one-sentence summary.
- Then explain the logic in order, referring to specific identifiers (functions, classes, variables).
- Note inputs, outputs, important side effects, and external dependencies.
- Use Markdown formatting (headings, bullets, fenced code blocks where helpful).

## Pass 2 — Security & correctness review
Check the code for real issues such as:
- Injection (SQL, command, LDAP, NoSQL), XSS, SSRF, path traversal.
- Auth/authorization mistakes, secret leakage, insecure crypto, weak randomness.
- Memory safety / unsafe deserialization where applicable.
- Obvious logic bugs, race conditions, or unhandled error paths.
- Use of deprecated or insecure dependencies.

## Output format (STRICT — the application parses this)

If you found one or more genuine issues:
1. Write the explanation and the issue analysis (with severity: Low / Medium / High / Critical, and a brief rationale for each finding).
2. Then on its own line write exactly: `Corrected Code:`
3. Immediately after that line, output ONLY the full corrected code inside a single fenced code block. No commentary after the code block.

If the code is correct and you found no real issues:
- Provide only the explanation. Do NOT include the string `Corrected Code:` anywhere in your response.
- You may briefly note "No security issues found." at the end of the explanation.

Code:
```
{code}
```"""

    try:
        ai_response_str = generate_with_gemini(prompt, system_instruction=system_instruction)

        corrected_code = None
        explanation = ai_response_str
        is_correct = True

        if "Corrected Code:" in ai_response_str:
            is_correct = False
            parts = ai_response_str.split("Corrected Code:", 1)
            explanation = parts[0].strip()
            # Strip surrounding fenced code block markers like ```python ... ```.
            raw_corrected = parts[1].strip()
            raw_corrected = re.sub(r"^```[a-zA-Z0-9_+\-]*\n?", "", raw_corrected)
            raw_corrected = re.sub(r"```\s*$", "", raw_corrected)
            corrected_code = raw_corrected.strip()

        logger.debug("Code explanation generated")
        return CodeExplanationResponse(
            is_correct=is_correct,
            explanation=explanation,
            corrected_code=corrected_code
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"An unexpected error occurred: {e}")
        raise HTTPException(status_code=500, detail="Failed to get explanation from AI.")

@app.get("/")
async def root():
    return {"message": "API is running."}

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)