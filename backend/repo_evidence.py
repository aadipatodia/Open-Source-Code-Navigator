"""Gather the evidence an answer has to be grounded in.

An answer is only as concrete as what the model can see, and a tree of file
names is not enough to write real code against. The clone is already on disk,
so we ask the model which files it would need to read, then quote those files
back to it. Letting it choose keeps this working for any stack instead of a
fixed list of filenames we happened to think of.

`repo_guide` and `issue_finder` both build their prompts on `gather_evidence`.
"""

import asyncio
import logging
import os
from typing import Iterator, List, Optional, Tuple

from fastapi import HTTPException

from core import generate, parse_list_reply
from repo_index import FileItem, index_repository, repo_cache

logger = logging.getLogger(__name__)

MAX_CONTEXT_FILES = int(os.getenv("CONTEXT_FILES", "12"))
MAX_CHARS_PER_FILE = int(os.getenv("CONTEXT_FILE_CHARS", "40000"))
MAX_CONTEXT_CHARS = int(os.getenv("CONTEXT_TOTAL_CHARS", "120000"))

SELECT_SYSTEM_INSTRUCTION = (
    "You decide which files someone must read before they can describe a codebase "
    "accurately. You answer with file paths and nothing else."
)


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


def iter_file_paths(items: List[FileItem]) -> Iterator[str]:
    for item in items:
        if item.type == "file":
            yield item.path
        yield from iter_file_paths(item.children or [])


def select_files(paths: List[str], task: str) -> List[str]:
    """Ask the model which files it needs to read, keeping only paths that really exist."""
    prompt = f"""Someone is about to work on the task below in this repository.

## Task
\"\"\"
{task}
\"\"\"

## Files in the repository
```
{chr(10).join(paths)}
```

Choose the files you would have to read before you could describe this codebase
accurately and write correct code against it. Include the ones that define how the
project is installed, run, tested and configured, and the ones that implement the
behaviour the task concerns.

Reply with at most {MAX_CONTEXT_FILES} paths, one per line, most useful first, each
copied exactly from the list above. No commentary, no numbering, no code fences."""

    try:
        reply = generate(prompt, SELECT_SYSTEM_INSTRUCTION, temperature=0.0)
    except HTTPException as exc:
        # Context is an optimisation; a plan without it still beats no plan at all.
        logger.warning("File selection failed, falling back to structure only: %s", exc.detail)
        return []

    available = set(paths)
    return [token for token in parse_list_reply(reply) if token in available][:MAX_CONTEXT_FILES]


def read_source(full_path: str, limit: int) -> Optional[str]:
    """Return a line-numbered excerpt of a text file, or None if it is binary or unreadable."""
    try:
        with open(full_path, "rb") as handle:
            raw = handle.read(limit + 1)
    except OSError:
        return None
    if not raw or b"\x00" in raw:
        return None

    text = raw.decode("utf-8", errors="replace")
    numbered = "\n".join(
        f"{number:>5} | {line}" for number, line in enumerate(text[:limit].splitlines(), 1)
    )
    if len(text) > limit:
        numbered += "\n      | ... (file continues)"
    return numbered or None


def read_selected(repo_root: str, paths: List[str]) -> str:
    """Quote the chosen files, stopping once the context budget is spent."""
    root = os.path.realpath(repo_root)
    blocks: List[str] = []
    used = 0

    for relative_path in paths:
        remaining = MAX_CONTEXT_CHARS - used
        if remaining <= 0:
            break
        full_path = os.path.realpath(os.path.join(repo_root, relative_path))
        # The paths come back from the model, so confirm they stayed inside the clone.
        if not full_path.startswith(root + os.sep):
            continue
        excerpt = read_source(full_path, min(MAX_CHARS_PER_FILE, remaining))
        if not excerpt:
            continue
        used += len(excerpt)
        blocks.append(f"#### {relative_path}\n```\n{excerpt}\n```")
    return "\n\n".join(blocks)


def sources_section(sources: str) -> str:
    if not sources:
        return (
            "## Source files\n"
            "None could be read this time. Work from the structure above, and say plainly "
            "where that limits what you can promise."
        )
    return (
        "## Source files, quoted from the clone\n"
        "These are the real contents. Line numbers are shown so you can cite exact "
        "locations as `path/to/file:line`.\n\n" + sources
    )


async def gather_evidence(repo_url: str, task: str) -> Tuple[str, str]:
    """Return the repo's file tree plus the contents of the files worth reading for a task."""
    analysis = await index_repository(repo_url)
    tree = format_tree(analysis["structure"])

    paths = list(iter_file_paths(analysis["structure"]))
    chosen = await asyncio.to_thread(select_files, paths, task)
    logger.info("Reading %d file(s) for context: %s", len(chosen), ", ".join(chosen) or "none")

    # Reading a dozen files is blocking I/O, so keep it off the event loop.
    sources = await asyncio.to_thread(read_selected, repo_cache[repo_url]["path"], chosen)
    return tree, sources_section(sources)
