"""Analyze Code: explain a pasted snippet and review it for security problems.

The only feature that needs no repository. The model answers in two passes and
marks a rewrite with a `Corrected Code:` line, which is what lets us split its
reply into an explanation and a suggested fix.
"""

import re
from typing import Optional

from fastapi import APIRouter, Form
from pydantic import BaseModel

from core import generate

router = APIRouter(tags=["code"])

REVIEW_SYSTEM_INSTRUCTION = (
    "You are a senior software engineer and application-security reviewer. "
    "You explain code accurately for developers of all levels and flag real vulnerabilities, "
    "but you never invent issues that are not present in the snippet."
)


class CodeExplanationResponse(BaseModel):
    is_correct: bool
    explanation: str
    corrected_code: Optional[str] = None


@router.post("/api/explain/code", response_model=CodeExplanationResponse)
async def explain_code(code: str = Form(...), context: str = Form("")):
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

    response = generate(prompt, REVIEW_SYSTEM_INSTRUCTION)
    if "Corrected Code:" not in response:
        return CodeExplanationResponse(is_correct=True, explanation=response)

    explanation, _, corrected = response.partition("Corrected Code:")
    corrected = re.sub(r"^```[a-zA-Z0-9_+\-]*\n?", "", corrected.strip())
    corrected = re.sub(r"```\s*$", "", corrected).strip()
    return CodeExplanationResponse(
        is_correct=False, explanation=explanation.strip(), corrected_code=corrected
    )
