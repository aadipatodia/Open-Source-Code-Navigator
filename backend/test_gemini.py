"""Quick smoke test for the Gemini integration used by the backend.

Requires a `GEMINI_API_KEY` (or `GOOGLE_API_KEY`) environment variable.
Run from the `backend/` directory with the project's virtual environment
activated:

    python test_gemini.py
"""

import os

import google.generativeai as genai
from dotenv import load_dotenv


def test_gemini() -> None:
    load_dotenv()
    api_key = os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY")
    if not api_key:
        print("ERROR: GEMINI_API_KEY (or GOOGLE_API_KEY) is not set.")
        return

    model_name = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")
    genai.configure(api_key=api_key)
    model = genai.GenerativeModel(model_name)

    try:
        response = model.generate_content(
            "Write a Python function that calculates the factorial of a non-negative integer. "
            "Keep the answer short."
        )
        print(f"Model: {model_name}")
        print("Generated response:\n")
        print(response.text)
    except Exception as exc:
        print(f"Error talking to Gemini: {exc}")


if __name__ == "__main__":
    test_gemini()
