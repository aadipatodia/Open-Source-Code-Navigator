"""Code Scout test suite: 15 checks, one per promise the design makes.

Each test builds one small situation and checks what Code Scout does. Wherever the
code would call Gemini or GitHub, a stand-in (stub) returns a fixed answer instead,
so the tests run offline in about a second and give the same result every time.

Run from the backend folder:  python -m pytest tests -v
"""

import asyncio
import os
import time

import httpx
import pytest
from fastapi import HTTPException

import chat
import code_analyzer
import dir_filter
import issue_finder
import main
import repo_evidence
import repo_guide
import repo_index
from auth import require_user
from dir_filter import DirectoryFilter


# ---------------------------------------------------------------- Getting the project
def test_01_rejects_a_link_that_is_not_a_github_repository():
    """Only github.com/<owner>/<repo> links are accepted."""
    with pytest.raises(HTTPException) as error:
        asyncio.run(repo_index.index_repository("https://example.com/some/project"))
    assert error.value.status_code == 400


def test_02_downloads_a_project_only_once_when_two_people_ask_at_the_same_time(monkeypatch):
    """Two simultaneous requests for one project share a single download."""
    downloads = []

    class FakeRepo:
        git_dir = ".git"

    def fake_download(url, folder, depth):
        downloads.append(url)
        time.sleep(0.2)
        return FakeRepo()

    def fake_tree(*args, **kwargs):
        time.sleep(0.1)
        return []

    monkeypatch.setattr(repo_index.git.Repo, "clone_from", staticmethod(fake_download))
    monkeypatch.setattr(repo_index, "build_file_tree", fake_tree)
    url = "https://github.com/demo/popular"

    async def two_people_at_once():
        await asyncio.gather(repo_index.index_repository(url), repo_index.index_repository(url))

    try:
        asyncio.run(two_people_at_once())
    finally:
        repo_index.repo_cache.pop(url, None)
    assert len(downloads) == 1


def test_03_file_tree_lists_top_level_first_and_stops_at_the_limit(tmp_path):
    """The tree is built level by level and never goes past its entry budget."""
    (tmp_path / "src" / "deep").mkdir(parents=True)
    (tmp_path / "src" / "deep" / "hidden.py").write_text("")
    for i in range(5):
        (tmp_path / f"file{i}.txt").write_text("")
    tree = repo_index.build_file_tree(str(tmp_path), str(tmp_path), DirectoryFilter(), budget=6)
    assert [item.name for item in tree] == ["src", "file0.txt", "file1.txt", "file2.txt", "file3.txt", "file4.txt"]
    assert tree[0].children == []  # the budget ran out before the second level


# ---------------------------------------------------------------- Keeping files safe
def test_04_file_viewer_blocks_paths_that_climb_out_of_the_project(signed_in_client, fake_project):
    """A path such as ../../etc/passwd is refused."""
    url, _ = fake_project
    reply = signed_in_client.get("/api/repo/file_content", params={"repo_url": url, "file_path": "../../etc/passwd"})
    assert reply.status_code == 403


def test_05_file_viewer_refuses_a_shortcut_to_a_file_outside_the_project(signed_in_client, fake_project, tmp_path):
    """A symbolic link pointing at a secret outside the project is not followed."""
    url, project = fake_project
    secret = tmp_path / "server-secrets.env"
    secret.write_text("GEMINI_API_KEY=do-not-leak")
    os.symlink(secret, project / "notes.txt")
    reply = signed_in_client.get("/api/repo/file_content", params={"repo_url": url, "file_path": "notes.txt"})
    assert reply.status_code == 403
    assert "do-not-leak" not in reply.text


def test_06_requests_without_sign_in_are_refused():
    """Every feature needs a signed-in user; no token means 401."""
    from fastapi.testclient import TestClient

    main.app.dependency_overrides.clear()
    reply = TestClient(main.app).post("/api/chat", json={"message": "hi", "history": []})
    assert reply.status_code == 401


# ---------------------------------------------------------------- Choosing and reading files
def test_07_file_names_the_ai_invented_are_thrown_away(monkeypatch):
    """Only names that really exist in the project survive, and never more than 12."""
    real_files = [f"src/file{i}.py" for i in range(20)]
    ai_reply = "src/made_up.py\n" + "\n".join(real_files)
    monkeypatch.setattr(repo_evidence, "generate", lambda *args, **kwargs: ai_reply)
    chosen = repo_evidence.select_files(real_files, "fix the login bug")
    assert "src/made_up.py" not in chosen
    assert len(chosen) == 12 and all(name in real_files for name in chosen)


def test_08_binary_files_are_skipped(tmp_path):
    """Files containing a zero byte (images, compiled code) are never quoted to the AI."""
    (tmp_path / "logo.png").write_bytes(b"PNG\x00\x01\x02")
    assert repo_evidence.read_selected(str(tmp_path), ["logo.png"]) == ""


def test_09_long_files_are_cut_marked_and_line_numbered(tmp_path):
    """A file over 40,000 characters is cut, the cut is marked, and lines are numbered."""
    (tmp_path / "big.py").write_text("x = 1\n" * 20000)  # 120,000 characters
    quoted = repo_evidence.read_selected(str(tmp_path), ["big.py"])
    assert "    1 | x = 1" in quoted
    assert "(file continues)" in quoted


def test_10_if_the_junk_folder_check_fails_nothing_is_hidden(monkeypatch):
    """When the AI call fails, every folder stays visible rather than risk hiding real code."""
    def broken_ai(*args, **kwargs):
        raise HTTPException(500, "AI unavailable")

    monkeypatch.setattr(dir_filter, "generate", broken_ai)
    folders = DirectoryFilter()
    folders.refine([("node_modules", "node_modules", "/nowhere/node_modules")])
    assert folders.ignored == set()


# ---------------------------------------------------------------- Features
def test_11_issue_search_shows_at_most_20_projects_and_25_issues_each(monkeypatch):
    """Results are grouped by project and capped, but every match is still counted."""
    results = []
    for project in range(25):
        for issue in range(30 if project == 0 else 1):
            results.append({
                "id": project * 100 + issue, "title": "Fix typo", "html_url": "https://github.com/x", "labels": [],
                "repository_url": f"https://api.github.com/repos/owner/project{project}",
            })
    monkeypatch.setattr(issue_finder, "github_get", lambda *args, **kwargs: {"items": results})
    groups = issue_finder.search_issues("python")
    assert len(groups) == 20
    assert len(groups[0].issues) == 25 and groups[0].issueCount == 30


def test_12_a_plan_is_split_into_its_steps_even_with_stray_spaces():
    """Each 'Step N' heading and 'Final Advice' becomes its own card on screen."""
    ai_reply = (
        "**Step 1: Understand the issue** \nRead the bug report.\n\n"
        "**Step 2: Make the change**\nEdit login.py.\n\n"
        "**Final Advice**  \nKeep the pull request small."
    )
    plan = repo_guide.parse_plan(ai_reply)
    assert [step.title for step in plan] == ["Understand the issue", "Make the change", "Final Advice"]


def test_13_code_review_separates_explanation_from_corrected_code(monkeypatch):
    """The fix is taken from after the 'Corrected Code:' line, even if the phrase also appears earlier."""
    ai_reply = (
        "The function is missing a colon. See the `Corrected Code:` section below.\n"
        "Severity: Low.\n\nCorrected Code:\n```python\ndef add(a, b):\n    return a + b\n```"
    )
    monkeypatch.setattr(code_analyzer, "generate", lambda *args, **kwargs: ai_reply)
    result = asyncio.run(code_analyzer.explain_code(code="def add(a, b) return a + b", context=""))
    assert result.is_correct is False
    assert result.corrected_code == "def add(a, b):\n    return a + b"
    assert "missing a colon" in result.explanation


def test_14_chat_remembers_only_the_last_seven_exchanges(monkeypatch):
    """Older messages are dropped so every request stays small and predictable."""
    sent_to_ai = {}
    monkeypatch.setattr(chat, "generate", lambda messages, *args, **kwargs: sent_to_ai.setdefault("m", messages) and "ok")
    history = [chat.ChatTurn(role="user" if i % 2 == 0 else "ai", text=f"message {i}") for i in range(30)]
    asyncio.run(chat.chat_with_ai(chat.ChatRequest(message="latest question", history=history)))
    assert len(sent_to_ai["m"]) == 7 * 2 + 1  # 7 question-and-answer pairs plus the new question


def test_15_a_slow_ai_answer_does_not_freeze_the_server_for_others(monkeypatch):
    """While one user waits 1 second for the AI, another user's request still answers at once."""
    monkeypatch.setattr(chat, "generate", lambda *args, **kwargs: time.sleep(1) or "slow answer")
    main.app.dependency_overrides[require_user] = lambda: {"sub": "test-user"}

    async def two_users():
        transport = httpx.ASGITransport(app=main.app)
        async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
            started = time.perf_counter()
            slow = asyncio.create_task(client.post("/api/chat", json={"message": "hi", "history": []}))
            await asyncio.sleep(0.1)  # give the slow request time to reach the AI
            quick = await client.get("/")
            waited = time.perf_counter() - started  # about 0.1 s if the server stayed free
            await slow
            return quick.status_code, waited

    try:
        status, waited = asyncio.run(two_users())
    finally:
        main.app.dependency_overrides.clear()
    assert status == 200
    assert waited < 0.5
