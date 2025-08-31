from fastapi import FastAPI, Depends, HTTPException, status, Form, Request, Query
from fastapi.middleware.cors import CORSMiddleware
from typing import Optional, List
import os
import json
from dotenv import load_dotenv
import requests
import logging
import tempfile
import shutil
import stat
from pydantic import BaseModel, Field
from github import Github, GithubException
import git
import re
import uvicorn
from descope import DescopeClient
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

# --- Basic Configuration ---
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)
load_dotenv()

app = FastAPI(title="Open-Source On-Ramp API", version="3.0.0")

# --- CORS Configuration ---
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:5173","http://localhost:3001"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Environment & API Configuration ---
OLLAMA_BASE_URL = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
OLLAMA_MODEL = os.getenv("OLLAMA_MODEL", "codellama")
GITHUB_PAT = os.getenv("GITHUB_PAT")
DESCOPE_PROJECT_ID = os.getenv("DESCOPE_PROJECT_ID")
descope_client = DescopeClient(project_id=DESCOPE_PROJECT_ID, jwt_validation_leeway=15)
security = HTTPBearer()

async def verify_descope_token(credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        descope_client.validate_session(session_token=credentials.credentials)
        return credentials.credentials
    except Exception as e:
        raise HTTPException(status_code=401, detail=f"Invalid or expired token: {e}")

if not GITHUB_PAT:
    logger.error("FATAL: GITHUB_PAT not found in .env file. The application cannot function without it.")
    raise RuntimeError("GitHub PAT not configured")

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

class UserStats(BaseModel):
    public_repos: int
    followers: int
    following: int

class GuidedContributionRequest(BaseModel):
    repoUrl: str
    issueUrl: str
    issueTitle: str

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

def get_github_client(token: str = Depends(verify_descope_token)):
    if not GITHUB_PAT:
        raise HTTPException(status_code=503, detail="GitHub PAT not configured on the server.")
    return Github(GITHUB_PAT)

def generate_with_ollama(prompt: str) -> str:
    try:
        mcp_url = "http://localhost:8080/api/generate"  # MCP server URL
        payload = {"model": OLLAMA_MODEL, "prompt": prompt, "stream": False}
        response = requests.post(mcp_url, json=payload, timeout=900)
        response.raise_for_status()
        return response.json().get("response", "").strip()
    except requests.exceptions.RequestException as e:
        logger.error(f"MCP API error: {e}")
        raise HTTPException(status_code=500, detail=f"Error connecting to MCP server: {e}")

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
async def analyze_repo(request: AnalyzeRepoRequest, token: str = Depends(verify_descope_token)):
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
        
        # CORRECTED LOGIC: The temporary directory itself is the repository's root.
        # The previous implementation incorrectly assumed a subdirectory was created.
        repo_root_path = temp_dir
        # We can extract the repository name from the URL
        repo_name = repo_url.split('/')[-1].replace('.git', '')
        logger.debug(f"Identified repo_root_path: {repo_root_path}")

        # The file tree should be built starting from the actual repo root (temp_dir)
        file_structure = build_file_tree(repo_root_path, start_dir=repo_root_path)
        logger.debug(f"File structure generated with {len(file_structure)} items")

        analysis_result = {"name": repo_name, "url": repo_url, "structure": file_structure}
        # Cache the correct path
        repo_cache[repo_url] = {"path": repo_root_path, "analysis": analysis_result}
        
        logger.info(f"Repository analysis completed for {repo_url}")
        return analysis_result
    except Exception as e:
        logger.error(f"Failed during repo analysis {repo_url}: {e}")
        shutil.rmtree(temp_dir, onerror=handle_remove_readonly)
        raise HTTPException(status_code=500, detail=f"Failed to analyze repository: {e}")
    
@app.get("/tools")
async def get_tools(token: str = Depends(verify_descope_token)):
    with open("tools.json", "r") as f:
        return json.load(f)

@app.on_event("shutdown")
async def cleanup():
    for repo in repo_cache.values():
        shutil.rmtree(repo["path"], onerror=handle_remove_readonly)
    repo_cache.clear()
    
@app.post("/api/summarize-code")
async def summarize_code(code: str = Form(...), context: str = Form(""), token: str = Depends(verify_descope_token)):
    logger.debug("Summarizing code snippet")
    prompt = (
        "You are an expert code reviewer. Provide a concise summary of the following code. "
        f"Context: '{context}'.\n\n"
        f"Code:\n```\n{code}\n```"
    )
    summary = generate_with_ollama(prompt)
    logger.debug("Code summary generated")
    return {"summary": summary}

@app.post("/api/contribute/guide", response_model=GuidedContributionResponse)
async def get_contribution_guide(request: GuidedContributionRequest, g: Github = Depends(get_github_client)):
    logger.debug(f"Generating contribution guide for issue: {request.issueTitle}")
    repo_name_match = re.search(r"github\.com/([\w\-]+/[\w\-]+)", request.repoUrl)
    issue_number_match = re.search(r"/issues/(\d+)", request.issueUrl)
    if not repo_name_match or not issue_number_match:
        logger.error(f"Invalid repository or issue URL: {request.repoUrl}, {request.issueUrl}")
        raise HTTPException(status_code=400, detail="Invalid repository or issue URL.")
    
    repo_full_name = repo_name_match.group(1)
    issue_number = int(issue_number_match.group(1))

    try:
        repo = g.get_repo(repo_full_name)
        issue = repo.get_issue(number=issue_number)
        issue_body = issue.body or "No description provided."
        logger.debug(f"Fetched issue {issue_number} from {repo_full_name}")
    except GithubException as e:
        logger.error(f"GitHub API error: {e.data.get('message')}")
        raise HTTPException(status_code=404, detail=f"Could not fetch issue details from GitHub: {e.data.get('message')}")

    if request.repoUrl not in repo_cache:
        logger.debug(f"Repository {request.repoUrl} not in cache, analyzing...")
        await analyze_repo(AnalyzeRepoRequest(repoUrl=request.repoUrl))
    
    analysis = repo_cache[request.repoUrl]['analysis']
    file_tree_string = format_file_tree_for_prompt(analysis['structure'])

    prompt = (
        "You are a senior software engineer mentoring a new open-source contributor. "
        "Your task is to provide a clear, concise, and actionable step-by-step plan to help them solve a specific GitHub issue. "
        "The plan should be easy to follow for someone new to the codebase.\n\n"
        "**GitHub Issue Title:**\n"
        f'"{request.issueTitle}"\n\n'
        "**GitHub Issue Description:**\n"
        f'"{issue_body}"\n\n'
        "**Repository File Structure (partial):**\n"
        f"```\n{file_tree_string}\n```\n\n"
        "**Your Task:**\n"
        "Based on all the information above, generate a step-by-step plan. For each step, provide a clear title and detailed instructions. "
        "Identify the most relevant files the contributor should look at. If you suggest code changes, provide clear examples.\n\n"
        "**Output Format:**\n"
        "Use the following format exactly, with 'Step X: [Title]' on one line and the details on the following lines.\n\n"
        "Step 1: [Title for Step 1]\n[Details for step 1...]\n\n"
        "Step 2: [Title for Step 2]\n[Details for step 2...]\n\n"
        "..."
    )

    logger.info(f"Generating contribution guide for issue: {request.issueTitle}")
    ai_response = generate_with_ollama(prompt)
    
    plan = []
    steps_raw = re.split(r'\n(?=Step \d+:)', ai_response)
    
    current_step_number = 1
    for step_text in steps_raw:
        if not step_text.strip():
            continue
        
        match = re.match(r'Step \d+:\s*(.*?)\n(.*)', step_text, re.DOTALL)
        if match:
            title, details = match.groups()
            plan.append(ContributionStep(
                step=current_step_number,
                title=title.strip(),
                details=details.strip()
            ))
            current_step_number += 1

    if not plan:
        logger.warning("No steps parsed from AI response, using fallback")
        plan.append(ContributionStep(step=1, title="Understand the Goal", details=ai_response))

    logger.debug(f"Contribution guide generated with {len(plan)} steps")
    return GuidedContributionResponse(plan=plan)

@app.post("/api/chat")
async def chat_with_ai(request: ChatRequest, token: str = Depends(verify_descope_token)):
    """
    Handles a chat message, sending it to the AI for a response.
    """
    logger.debug(f"Received chat message: {request.message}")

    # You can customize this prompt to provide more context to the AI
    prompt = (
        "You are a helpful and knowledgeable AI assistant. "
        "Your goal is to answer questions concisely and accurately.\n\n"
        f"User: {request.message}\n"
        "AI:"
    )

    try:
        ai_response = generate_with_ollama(prompt)
        logger.debug("AI response generated successfully.")
        return {"response": ai_response}
    except HTTPException as e:
        logger.error(f"Error during AI chat response: {e.detail}")
        raise e
    except Exception as e:
        logger.error(f"Unexpected error during AI chat response: {e}")
        raise HTTPException(status_code=500, detail="Failed to get a response from the AI.")

@app.get("/api/repo/file_content")
async def get_file_content(repo_url: str = Query(...), file_path: str = Query(...), token: str = Depends(verify_descope_token)):
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
async def find_issues(request: FindIssuesRequest, g: Github = Depends(get_github_client)):
    logger.debug(f"Searching issues with skills: {request.skills}")
    skills_query = ' '.join(request.skills.split(','))
    query = f'{skills_query} is:issue is:open label:"good first issue"'
    try:
        issues = g.search_issues(query, sort='created', order='desc')
        results = [
            Issue(id=issue.id, title=issue.title, url=issue.html_url, repoName=issue.repository.full_name, labels=[label.name for label in issue.labels])
            for issue in issues[:15]
        ]
        logger.info(f"Found {len(results)} issues for query: {query}")
        return results
    except GithubException as e:
        logger.error(f"Failed to fetch issues from GitHub: {e.data.get('message', 'Unknown error')}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch issues from GitHub: {e.data.get('message', 'Unknown error')}")

@app.get("/api/user/stats", response_model=UserStats)
async def get_user_stats(g: Github = Depends(get_github_client)):
    logger.debug("Fetching user stats")
    try:
        user = g.get_user()
        stats = UserStats(public_repos=user.public_repos, followers=user.followers, following=user.following)
        logger.debug(f"User stats: {stats}")
        return stats
    except GithubException as e:
        logger.error(f"Failed to fetch user stats from GitHub: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch user stats from GitHub.")

@app.post("/api/explain/code", response_model=CodeExplanationResponse)
async def explain_code(code: str = Form(...), context: str = Form(""), token: str = Depends(verify_descope_token)):
    logger.debug("Analyzing and explaining code snippet")
    
    # A simpler prompt that doesn't require the AI to format JSON
    prompt = (
        "You are an expert code debugger. Analyze the following code snippet. \n"
        "If the code has errors, explain them clearly and provide a corrected version under a 'Corrected Code:' heading.\n"
        "If the code is correct, provide a clear, step-by-step explanation of what it does.\n\n"
        f"Context: '{context}'\n"
        f"Code:\n```\n{code}\n```"
    )

    try:
        # Get the raw text response from the AI
        ai_response_str = generate_with_ollama(prompt)
        
        corrected_code = None
        explanation = ai_response_str
        is_correct = True # Assume correct unless we find evidence of an error

        # Simple logic to check if the AI provided a corrected version
        if "Corrected Code:" in ai_response_str:
            is_correct = False
            parts = ai_response_str.split("Corrected Code:", 1)
            explanation = parts[0].strip()
            corrected_code = parts[1].strip().replace("```python", "").replace("```", "").strip()

        logger.debug("Code explanation generated")
        return CodeExplanationResponse(
            is_correct=is_correct,
            explanation=explanation,
            corrected_code=corrected_code
        )
        
    except Exception as e:
        logger.error(f"An unexpected error occurred: {e}")
        raise HTTPException(status_code=500, detail="Failed to get explanation from AI.")

@app.get("/")
async def root():
    return {"message": "API is running."}

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)