"""Repo index — clone a GitHub repo into a temp dir and build a browsable file tree.

The clone is cached by URL so later steps (evidence gathering, file viewing)
read from disk without re-cloning. main.py empties the cache on shutdown.
"""

import asyncio
import logging
import os
import re
import shutil
import tempfile
from typing import List, Optional

import git
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel

from dir_filter import DirectoryFilter

logger = logging.getLogger(__name__)
router = APIRouter(tags=["repository"])

# How many entries a file tree may contain before it stops expanding. This bounds
# the payload for a huge repository without imposing a depth limit on a small one.
TREE_NODE_BUDGET = int(os.getenv("TREE_NODES", "3000"))

# Cloning is CPU/network heavy, so only a couple may run at once.
CLONE_SEMAPHORE = asyncio.Semaphore(int(os.getenv("CLONE_CONCURRENCY", "2")))

# repo_url -> {"path": <temp dir>, "analysis": <RepoAnalysisResponse payload>}
repo_cache: dict = {}


class FileItem(BaseModel):
    name: str
    path: str
    type: str
    children: Optional[List["FileItem"]] = None


class RepoAnalysisResponse(BaseModel):
    name: str
    url: str
    structure: List[FileItem]


class AnalyzeRepoRequest(BaseModel):
    repoUrl: str


def clear_cache() -> None:
    """Delete every clone this process made. Called on shutdown."""
    for entry in repo_cache.values():
        shutil.rmtree(entry["path"], ignore_errors=True)
    repo_cache.clear()


def list_directory(directory: str, repo_root: str) -> List[FileItem]:
    """List one directory as FileItems, with paths relative to the repository root."""
    try:
        names = os.listdir(directory)
    except OSError as exc:
        logger.warning("Could not read %s: %s", directory, exc)
        return []

    items: List[FileItem] = []
    for name in names:
        full_path = os.path.join(directory, name)
        is_directory = os.path.isdir(full_path)
        items.append(
            FileItem(
                name=name,
                path=os.path.relpath(full_path, start=repo_root).replace(os.sep, "/"),
                type="directory" if is_directory else "file",
                children=[],
            )
        )

    items.sort(key=lambda item: (item.type != "directory", item.name))
    return items


def build_file_tree(
    directory: str,
    repo_root: str,
    dir_filter: DirectoryFilter,
    budget: int = TREE_NODE_BUDGET,
) -> List[FileItem]:
    """Build a file tree breadth-first, spending a node budget on the shallowest entries.

    Going level by level rather than cutting at a fixed depth means a small repository
    is described in full, while a large one is described broadly instead of having its
    deeper directories disappear entirely.
    """
    root: List[FileItem] = []
    frontier = [(directory, root)]
    remaining = budget

    while frontier and remaining > 0:
        level = [
            (parent_path, siblings, list_directory(parent_path, repo_root))
            for parent_path, siblings in frontier
        ]
        # Judge this level before descending, so noise is never opened at all.
        dir_filter.refine(
            (item.name, item.path, os.path.join(parent_path, item.name))
            for parent_path, _, items in level
            for item in items
            if item.type == "directory"
        )

        next_frontier = []
        for parent_path, siblings, items in level:
            for item in items:
                if remaining <= 0:
                    break
                if item.type == "directory":
                    if item.name in dir_filter.ignored:
                        continue
                    if item.children is not None:
                        next_frontier.append(
                            (os.path.join(parent_path, item.name), item.children)
                        )
                siblings.append(item)
                remaining -= 1
        frontier = next_frontier

    if remaining <= 0:
        logger.info("File tree for %s truncated at %d entries", repo_root, budget)
    return root


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
            repo = git.Repo.clone_from(repo_url, temp_dir, depth=1)
            # Git names its own metadata directory, so we never have to guess at it.
            dir_filter = DirectoryFilter({os.path.basename(os.path.normpath(repo.git_dir))})

            analysis = {
                "name": repo_url.rstrip("/").split("/")[-1].removesuffix(".git"),
                "url": repo_url,
                # Walking the tree now waits on the model, so keep it off the event loop.
                "structure": await asyncio.to_thread(
                    build_file_tree, temp_dir, temp_dir, dir_filter
                ),
            }
        except Exception as exc:
            shutil.rmtree(temp_dir, ignore_errors=True)
            logger.error("Failed to analyze %s: %s", repo_url, exc)
            raise HTTPException(500, f"Failed to analyze repository: {exc}") from exc

        repo_cache[repo_url] = {"path": temp_dir, "analysis": analysis}
        return analysis


@router.post("/api/analyze/repo", response_model=RepoAnalysisResponse)
async def analyze_repo(request: AnalyzeRepoRequest):
    """POST endpoint — clone and return the repo's file tree."""
    return await index_repository(request.repoUrl)


@router.get("/api/repo/file_content")
async def get_file_content(repo_url: str = Query(...), file_path: str = Query(...)):
    """GET endpoint — return the UTF-8 text of a single file from a cached clone."""
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
