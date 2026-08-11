"""Decide which directories in a clone are not worth walking into.

Every repository buries its own code among installed packages, build output and
caches. Rather than match a list of names we happened to think of, we show the
model what each directory actually holds and let it judge, which keeps working
for stacks nobody here has seen.

Used by `repo_index` while it walks a freshly cloned repository.
"""

import logging
import os
from typing import Iterable, List, Optional, Tuple

from fastapi import HTTPException

from core import generate, parse_list_reply

logger = logging.getLogger(__name__)

# How many times we will ask about unfamiliar directory names while walking one repo.
MAX_DIRECTORY_CHECKS = int(os.getenv("DIRECTORY_CHECKS", "6"))

SKIP_SYSTEM_INSTRUCTION = (
    "You decide which directories in a checkout hold generated or installed output "
    "rather than source anyone would read. You answer with names and nothing else."
)


def describe_directory(full_path: str, limit: int = 8) -> str:
    """Summarise what a directory holds, which is what makes it recognisable."""
    try:
        entries = sorted(os.listdir(full_path))
    except OSError:
        return "unreadable"
    if not entries:
        return "empty"
    shown = ", ".join(entries[:limit])
    return f"{shown}, ... ({len(entries)} entries)" if len(entries) > limit else shown


def select_skippable_dirs(described: List[Tuple[str, str, str]]) -> set:
    """Ask which of these directories hold nothing a contributor would read.

    Each entry is (name, path, contents). The contents matter: a directory called
    `build` full of source is worth keeping, and one full of hashed bundles is not.
    """
    if not described:
        return set()

    listing = "\n".join(
        f"{name}  (at {path})  contains: {contents}" for name, path, contents in described
    )
    prompt = f"""These directories were found in a freshly cloned repository.

```
{listing}
```

Which of them hold content nobody would read or edit when contributing - dependencies
fetched by a package manager, compiled or bundled output, caches, coverage and test
artefacts, virtual environments, or version control internals?

Judge by what each one actually contains, not by its name alone. Be conservative: if a
directory could plausibly hold source, configuration, tests, or documentation that
someone would edit, leave it out. A directory holding the project's own code is never
noise, however it is named.

Reply with the names to ignore, one per line, copied exactly. No commentary. If none
qualify, reply with nothing."""

    try:
        reply = generate(prompt, SKIP_SYSTEM_INSTRUCTION, allow_empty=True, temperature=0.0)
    except HTTPException as exc:
        # Showing noise is recoverable; failing to index the repository is not.
        logger.warning("Could not classify directories, keeping all of them: %s", exc.detail)
        return set()

    # The listing shows a name and a path, so answers come back as either. They also
    # come back as paths one level deeper, when the model spots noise inside a
    # directory it was only asked to judge as a whole.
    names = {name for name, _, _ in described}
    paths = {path: name for name, path, _ in described}

    chosen = set()
    for token in parse_list_reply(reply):
        if token in names:
            chosen.add(token)
        elif token in paths:
            chosen.add(paths[token])
        elif any(token.startswith(f"{path}/") for path in paths):
            chosen.add(token.rsplit("/", 1)[-1])
        else:
            logger.warning("Ignoring an unrecognised directory answer: %r", token)
    return chosen


class DirectoryFilter:
    """Learns which directory names to ignore, asking about new ones as they turn up.

    Judging each level before descending into it means we never look inside a
    dependency directory, so the model is asked about a handful of real directory
    names rather than thousands of installed package names.
    """

    def __init__(self, ignore: Optional[set] = None):
        self.ignored: set = set(ignore or ())
        self.judged: set = set(self.ignored)
        self.checks_left = MAX_DIRECTORY_CHECKS

    def refine(self, directories: Iterable[Tuple[str, str, str]]) -> None:
        """Judge any directory names not seen before. Each entry is (name, path, full path)."""
        fresh: List[Tuple[str, str, str]] = []
        for name, relative_path, full_path in directories:
            if name in self.judged:
                continue
            self.judged.add(name)
            fresh.append((name, relative_path, describe_directory(full_path)))

        if not fresh or self.checks_left <= 0:
            return
        self.checks_left -= 1

        offered = {name for name, _, _ in fresh}
        chosen = select_skippable_dirs(sorted(fresh))
        if offered <= chosen:
            # Rejecting everything on offer is not a judgement, it is a failure to judge.
            logger.warning("Every directory here was called noise; keeping them all instead")
            return

        if chosen:
            logger.info("Ignoring directories named: %s", ", ".join(sorted(chosen)))
        self.ignored |= chosen
        self.judged |= chosen
