"""Turn repository evidence into a contribution plan.

The endpoint here writes an onboarding guide for a repository as a whole.
`issue_finder` writes the other kind, for a single issue, and shares the house
style and the parser defined below - the frontend renders both as a list of
numbered steps, which is what `parse_plan` produces.
"""

import logging
import re
from typing import List

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from core import generate
from repo_evidence import gather_evidence

logger = logging.getLogger(__name__)
router = APIRouter(tags=["repository"])


class RepoGuideRequest(BaseModel):
    repoUrl: str


class ContributionStep(BaseModel):
    step: int
    title: str
    details: str


class GuidedContributionResponse(BaseModel):
    plan: List[ContributionStep]


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
3. The quoted source files are the ground truth - reason from them, not from how projects like this usually look. Use the real function, class, and variable names exactly as they appear there, and cite locations as `path/to/file:line` when you describe existing behaviour. Name a file only if it appears in the structure, always by its full path from the repository root. Where you are inferring something the quoted files do not show, mark it as an assumption, say what it rests on, and give the single command that settles it.
4. Never hand the research back. "Investigate X", "check the docs", "verify the exact API", and "update this based on the patterns you find" are all failures - they leave the reader exactly where they started. Take a position instead.
5. Every code block must be complete and runnable as written: real imports, the symbol names actually used in the quoted files, no `# implement this here` placeholders, no pseudocode, and matching the style visible in the project. A "before" snippet must be the code as it really appears, not an approximation of it.
6. Every verification step must name the observable result - the exact output, exit code, or on-screen change that means it worked - plus the most likely failure and what it would mean.
7. The reader has the issue open already. Do not restate it; use the space to add what they cannot see for themselves.
8. Use Markdown bullets, numbered lists, and fenced code blocks with language tags. Length is fine when it carries information; filler is not.
9. Where the quoted source contradicts the request - the work already looks done, or the code does not behave as described - the source wins. Say so in the first section, quote the line that proves it, and plan from the code as it actually is. Never reconstruct a "before" state to match the description."""


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


@router.post("/api/contribute/repo-guide", response_model=GuidedContributionResponse)
async def get_repo_contribution_guide(request: RepoGuideRequest):
    """Generate a general onboarding guide for a repository, with no issue required."""
    repo_match = re.search(r"github\.com/([\w\-\.]+/[\w\-\.]+)", request.repoUrl)
    if not repo_match:
        raise HTTPException(400, "Invalid repository URL.")

    tree, sources = await gather_evidence(
        request.repoUrl,
        f"Write an onboarding and contribution guide for {repo_match.group(1)}: what it does, "
        "how it is structured, how to run it, how to test it, and how to contribute.",
    )

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

{sources}

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
