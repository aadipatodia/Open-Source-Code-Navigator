"""Shared setup: environment, logging, and the one place we call Gemini.

Every feature module talks to Gemini, so the client lives here rather than in
`main`. It cannot live in `main`, because `main` has to import the feature
modules to register their routes, and they would have to import it back.
"""

import logging
import os
import re
from typing import List, Optional, Union

import google.generativeai as genai
from dotenv import load_dotenv
from fastapi import HTTPException

load_dotenv()
logging.basicConfig(level=os.getenv("LOG_LEVEL", "INFO").upper())
logger = logging.getLogger(__name__)

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


def generate(
    prompt: Union[str, List[dict]],
    system_instruction: str,
    allow_empty: bool = False,
    temperature: Optional[float] = None,
) -> str:
    """Send a prompt to Gemini and return the generated text.

    Questions with a single right answer pass a temperature of their own; sampling
    only makes them inconsistent.
    """
    config = dict(GENERATION_CONFIG)
    if temperature is not None:
        config["temperature"] = temperature

    model = genai.GenerativeModel(
        model_name=GEMINI_MODEL,
        generation_config=config,
        system_instruction=system_instruction,
    )
    try:
        response = model.generate_content(prompt)
    except Exception as exc:
        logger.error("Gemini request failed: %s", exc)
        raise HTTPException(500, f"Error calling Gemini API: {exc}") from exc

    try:
        text = (response.text or "").strip()
    except Exception:
        # The accessor raises when a candidate came back with no parts. That is a model
        # that chose to say nothing, not a transport failure, so treat it as empty text.
        text = ""

    if not text and not allow_empty:
        # Usually means every candidate was dropped by a safety filter. Callers whose
        # question can legitimately have no answer opt out of this check.
        reason = getattr(getattr(response, "prompt_feedback", None), "block_reason", None)
        raise HTTPException(502, f"Gemini returned an empty response (block_reason={reason}).")
    return text


# One leading bullet or list number, which models add even when told not to.
LIST_MARKER_RE = re.compile(r"^\s*(?:[-*+]|\d+[.)])\s+")


def parse_list_reply(reply: str) -> List[str]:
    """Read a one-per-line answer into clean, distinct tokens."""
    tokens: List[str] = []
    for line in reply.splitlines():
        token = LIST_MARKER_RE.sub("", line).strip().strip("`").strip()
        if token and token not in tokens:
            tokens.append(token)
    return tokens
