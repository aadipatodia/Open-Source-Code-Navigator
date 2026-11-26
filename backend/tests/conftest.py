"""Shared fixtures. No test calls Gemini or GitHub: both are replaced by stand-ins."""

import os
import sys

import pytest

os.environ.setdefault("GEMINI_API_KEY", "test-key-not-real")
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import repo_index  # noqa: E402


@pytest.fixture
def fake_repo(tmp_path):
    """A small checkout registered in the clone cache, as if it had been analysed."""
    root = tmp_path / "clone"
    (root / "src").mkdir(parents=True)
    (root / "src" / "app.py").write_text("print('hello')\n")
    (root / "README.md").write_text("# demo\n")
    url = "https://github.com/demo/repo"
    repo_index.repo_cache[url] = {"path": str(root), "analysis": {}}
    yield url, root
    repo_index.repo_cache.pop(url, None)


@pytest.fixture
def client():
    from fastapi.testclient import TestClient
    import main

    return TestClient(main.app)
