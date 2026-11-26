"""Shared set-up for the tests. No test calls Gemini or GitHub."""

import os
import sys

import pytest

os.environ.setdefault("GEMINI_API_KEY", "test-key-not-real")
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import repo_index  # noqa: E402


@pytest.fixture
def fake_project(tmp_path):
    """A small downloaded project, registered as if Code Scout had analysed it."""
    project = tmp_path / "project"
    (project / "src").mkdir(parents=True)
    (project / "src" / "app.py").write_text("print('hello')\n")
    (project / "README.md").write_text("# demo\n")
    url = "https://github.com/demo/project"
    repo_index.repo_cache[url] = {"path": str(project), "analysis": {}}
    yield url, project
    repo_index.repo_cache.pop(url, None)


@pytest.fixture
def signed_in_client():
    """A test client whose requests count as coming from a signed-in user."""
    from fastapi.testclient import TestClient
    import main
    from auth import require_user

    main.app.dependency_overrides[require_user] = lambda: {"sub": "test-user"}
    yield TestClient(main.app)
    main.app.dependency_overrides.clear()
