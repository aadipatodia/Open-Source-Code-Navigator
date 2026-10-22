"""Issue finder — search GitHub for good-first-issue tickets and plan a contribution.

Skills search returns open issues grouped by project; picking one generates a
step-by-step plan using the same evidence and style as the repo guide.
"""

import logging
import os
import re
from typing import List, Optional

import requests
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from core import generate
from repo_evidence import gather_evidence
from repo_guide import (
    PLAN_FORMAT_RULES,
    PLAN_SYSTEM_INSTRUCTION,
    GuidedContributionResponse,
    parse_plan,
)

logger = logging.getLogger(__name__)
router = APIRouter(tags=["issues"])

GITHUB_API = "https://api.github.com"

# One busy project can file dozens of good-first issues at once, so we read a wide
# page of results and group them. Without this a search returns one repo's backlog.
ISSUE_SEARCH_PAGE = int(os.getenv("ISSUE_SEARCH_PAGE", "100"))
MAX_ISSUE_REPOS = int(os.getenv("ISSUE_REPOS", "20"))
MAX_ISSUES_PER_REPO = int(os.getenv("ISSUES_PER_REPO", "25"))


# --------------------------------------------------------------------------
# Schemas
# --------------------------------------------------------------------------
class Issue(BaseModel):
    id: int
    title: str
    url: str
    repoName: str
    labels: List[str]


class RepoIssueGroup(BaseModel):
    repoName: str
    repoUrl: str
    issueCount: int
    issues: List[Issue]


class FindIssuesRequest(BaseModel):
    skills: str


class GuidedContributionRequest(BaseModel):
    repoUrl: str
    issueUrl: str
    issueTitle: str
    issueBody: str


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


def search_issues(skills: str) -> List[RepoIssueGroup]:
    """Find open `good first issue` tickets, grouped by the project that owns them.

    Results keep the order GitHub returned them in, so the repository with the most
    recent matching issue leads rather than the one that filed the most.
    """
    terms = " ".join(part.strip() for part in skills.split(",") if part.strip())
    if not terms:
        raise HTTPException(400, "Please enter at least one skill to search for.")

    payload = github_get(
        "/search/issues",
        {
            "q": f'{terms} is:issue is:open label:"good first issue"',
            "sort": "created",
            "order": "desc",
            "per_page": ISSUE_SEARCH_PAGE,
        },
    )

    groups: dict = {}
    for item in payload.get("items", []):
        api_url = item.get("repository_url", "")
        repo_name = api_url.split("/repos/", 1)[1] if "/repos/" in api_url else "unknown/repo"

        group = groups.get(repo_name)
        if group is None:
            if len(groups) >= MAX_ISSUE_REPOS:
                continue
            group = groups[repo_name] = RepoIssueGroup(
                repoName=repo_name,
                repoUrl=f"https://github.com/{repo_name}",
                issueCount=0,
                issues=[],
            )

        # Count every match, even past the point where we stop listing them.
        group.issueCount += 1
        if len(group.issues) < MAX_ISSUES_PER_REPO:
            group.issues.append(
                Issue(
                    id=item["id"],
                    title=item["title"],
                    url=item["html_url"],
                    repoName=repo_name,
                    labels=[label["name"] for label in item.get("labels", [])],
                )
            )
    return list(groups.values())


def fetch_issue_body(repo_full_name: str, issue_number: int) -> str:
    """Fetch the body text of a single GitHub issue by its number."""
    payload = github_get(f"/repos/{repo_full_name}/issues/{issue_number}", timeout=15)
    return payload.get("body") or "No description provided."


# --------------------------------------------------------------------------
# Endpoints
# --------------------------------------------------------------------------
@router.post("/api/issues/find", response_model=List[RepoIssueGroup])
async def find_issues(request: FindIssuesRequest):
    """POST endpoint — return good-first-issue results grouped by repository."""
    return search_issues(request.skills)


@router.post("/api/contribute/guide", response_model=GuidedContributionResponse)
async def get_contribution_guide(request: GuidedContributionRequest):
    """POST endpoint — generate a contribution plan for a specific issue."""
    repo_match = re.search(r"github\.com/([\w\-]+/[\w\-]+)", request.repoUrl)
    issue_match = re.search(r"/issues/(\d+)", request.issueUrl)
    if not repo_match or not issue_match:
        raise HTTPException(400, "Invalid repository or issue URL.")

    issue_body = request.issueBody.strip() or fetch_issue_body(repo_match.group(1), int(issue_match.group(1)))
    tree, sources = await gather_evidence(request.repoUrl, f"{request.issueTitle}\n\n{issue_body}")

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

{sources}

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
