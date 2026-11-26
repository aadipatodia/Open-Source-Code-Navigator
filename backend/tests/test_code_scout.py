"""Checks Code Scout's own code against the behaviour its design describes.

Each test sets up one situation and asserts what the design says should happen.
Model and GitHub calls are replaced by stubs, so only ordinary program logic runs.
"""

import asyncio
import os
import time

import pytest
from fastapi import HTTPException

import chat
import code_analyzer
import core
import dir_filter
import issue_finder
import repo_evidence
import repo_guide
import repo_index
from dir_filter import DirectoryFilter


# --------------------------------------------------------------------------
# Repository intake and file route (7)
# --------------------------------------------------------------------------
def test_intake_rejects_non_github_url():
    with pytest.raises(HTTPException) as exc:
        asyncio.run(repo_index.index_repository("https://example.com/a/b"))
    assert exc.value.status_code == 400


def test_file_route_unknown_repo_is_404(client):
    r = client.get("/api/repo/file_content", params={"repo_url": "https://github.com/no/such", "file_path": "a"})
    assert r.status_code == 404


def test_file_route_blocks_dot_dot_traversal(client, fake_repo):
    url, _ = fake_repo
    r = client.get("/api/repo/file_content", params={"repo_url": url, "file_path": "../../etc/passwd"})
    assert r.status_code == 403


def test_file_route_refuses_symlink_leaving_repo(client, fake_repo, tmp_path):
    url, root = fake_repo
    secret = tmp_path / "server.env"
    secret.write_text("GEMINI_API_KEY=super-secret\n")
    os.symlink(secret, root / "innocent.txt")
    r = client.get("/api/repo/file_content", params={"repo_url": url, "file_path": "innocent.txt"})
    assert r.status_code in (403, 404)
    assert "super-secret" not in r.text


def test_tree_does_not_expand_symlinked_directory_outside_repo(tmp_path):
    outside = tmp_path / "outside"
    outside.mkdir()
    (outside / "private.key").write_text("x")
    root = tmp_path / "clone"
    root.mkdir()
    os.symlink(outside, root / "linked")
    tree = repo_index.build_file_tree(str(root), str(root), DirectoryFilter(), budget=100)
    linked = [item for item in tree if item.name == "linked"]
    assert not linked or not linked[0].children


def test_concurrent_requests_for_same_repo_clone_once(monkeypatch, tmp_path):
    clones = []

    class FakeRepo:
        git_dir = ".git"

    def fake_clone(url, target, depth):
        clones.append(url)
        time.sleep(0.2)
        (tmp_path / "x").mkdir(exist_ok=True)
        return FakeRepo()

    monkeypatch.setattr(repo_index.git.Repo, "clone_from", staticmethod(fake_clone))
    def slow_tree(*a, **k):
        time.sleep(0.1)  # a real walk takes time, and waits on the directory filter
        return []

    monkeypatch.setattr(repo_index, "build_file_tree", slow_tree)
    url = "https://github.com/demo/concurrent"

    async def two_at_once():
        await asyncio.gather(repo_index.index_repository(url), repo_index.index_repository(url))

    try:
        asyncio.run(two_at_once())
    finally:
        repo_index.repo_cache.pop(url, None)
    assert len(clones) == 1


def test_tree_walk_is_breadth_first_and_respects_budget(tmp_path):
    root = tmp_path / "clone"
    (root / "a" / "deep").mkdir(parents=True)
    (root / "a" / "deep" / "f.py").write_text("")
    for i in range(5):
        (root / f"top{i}.txt").write_text("")
    tree = repo_index.build_file_tree(str(root), str(root), DirectoryFilter(), budget=6)
    assert [item.name for item in tree] == ["a", "top0.txt", "top1.txt", "top2.txt", "top3.txt", "top4.txt"]
    assert tree[0].children == []  # budget spent before the second level


# --------------------------------------------------------------------------
# Evidence selection and reading (6)
# --------------------------------------------------------------------------
def test_selection_drops_invented_paths(monkeypatch):
    monkeypatch.setattr(repo_evidence, "generate", lambda *a, **k: "src/app.py\nsrc/made_up.py\n- README.md")
    assert repo_evidence.select_files(["src/app.py", "README.md"], "task") == ["src/app.py", "README.md"]


def test_selection_keeps_at_most_twelve(monkeypatch):
    paths = [f"f{i}.py" for i in range(30)]
    monkeypatch.setattr(repo_evidence, "generate", lambda *a, **k: "\n".join(paths))
    assert len(repo_evidence.select_files(paths, "task")) == 12


def test_selection_failure_falls_back_to_tree_only(monkeypatch):
    def boom(*a, **k):
        raise HTTPException(502, "empty")

    monkeypatch.setattr(repo_evidence, "generate", boom)
    assert repo_evidence.select_files(["a.py"], "task") == []
    assert "None could be read" in repo_evidence.sources_section("")


def test_reader_skips_binary_files(tmp_path):
    (tmp_path / "img.bin").write_bytes(b"PNG\x00\x01\x02")
    assert repo_evidence.read_selected(str(tmp_path), ["img.bin"]) == ""


def test_reader_cuts_long_file_and_marks_cut(tmp_path):
    (tmp_path / "big.py").write_text("x = 1\n" * 20000)  # 120,000 characters
    out = repo_evidence.read_selected(str(tmp_path), ["big.py"])
    assert "(file continues)" in out
    assert "    1 | x = 1" in out


def test_reader_refuses_symlink_leaving_clone(tmp_path):
    secret = tmp_path / "secret.env"
    secret.write_text("KEY=1")
    clone = tmp_path / "clone"
    clone.mkdir()
    os.symlink(secret, clone / "link.txt")
    assert repo_evidence.read_selected(str(clone), ["link.txt"]) == ""


# --------------------------------------------------------------------------
# Directory filter (3)
# --------------------------------------------------------------------------
def test_filter_ignores_answer_that_discards_everything(monkeypatch):
    monkeypatch.setattr(dir_filter, "generate", lambda *a, **k: "src\nlib")
    f = DirectoryFilter()
    f.refine([("src", "src", "/nonexistent/src"), ("lib", "lib", "/nonexistent/lib")])
    assert f.ignored == set()


def test_filter_makes_at_most_six_calls(monkeypatch):
    calls = []
    monkeypatch.setattr(dir_filter, "generate", lambda *a, **k: calls.append(1) or "")
    f = DirectoryFilter()
    for i in range(10):
        f.refine([(f"d{i}", f"d{i}", f"/nonexistent/d{i}")])
    assert len(calls) == 6


def test_filter_keeps_everything_when_call_fails(monkeypatch):
    def boom(*a, **k):
        raise HTTPException(500, "down")

    monkeypatch.setattr(dir_filter, "generate", boom)
    f = DirectoryFilter()
    f.refine([("node_modules", "node_modules", "/nonexistent/nm")])
    assert f.ignored == set()


# --------------------------------------------------------------------------
# Issue search (2)
# --------------------------------------------------------------------------
def test_issue_search_caps_repositories_and_issues(monkeypatch):
    items = []
    for r in range(25):
        for i in range(30 if r == 0 else 1):
            items.append({
                "id": r * 100 + i, "title": "t", "html_url": "u", "labels": [],
                "repository_url": f"https://api.github.com/repos/o/r{r}",
            })
    monkeypatch.setattr(issue_finder, "github_get", lambda *a, **k: {"items": items})
    groups = issue_finder.search_issues("python")
    assert len(groups) == 20
    assert len(groups[0].issues) == 25 and groups[0].issueCount == 30


def test_issue_search_requires_a_skill():
    with pytest.raises(HTTPException) as exc:
        issue_finder.search_issues(" , ")
    assert exc.value.status_code == 400


# --------------------------------------------------------------------------
# Plan parsing (2)
# --------------------------------------------------------------------------
def test_plan_parser_splits_steps_and_final_advice():
    reply = "**Step 1: Read**\nbody one\n\n**Step 2: Change**\nbody two\n\n**Final Advice**\n- be kind"
    plan = repo_guide.parse_plan(reply)
    assert [s.title for s in plan] == ["Read", "Change", "Final Advice"]


def test_plan_parser_tolerates_trailing_space_after_heading():
    reply = "**Step 1: Read** \nbody one\n\n**Step 2: Change**  \nbody two\n\n**Final Advice**\n- be kind"
    plan = repo_guide.parse_plan(reply)
    assert [s.title for s in plan] == ["Read", "Change", "Final Advice"]


# --------------------------------------------------------------------------
# Snippet review (2)
# --------------------------------------------------------------------------
def _review(monkeypatch, reply):
    monkeypatch.setattr(code_analyzer, "generate", lambda *a, **k: reply)
    return asyncio.run(code_analyzer.explain_code(code="x = 1", context=""))


def test_review_without_marker_is_marked_correct(monkeypatch):
    result = _review(monkeypatch, "Assigns 1 to x. No security issues found.")
    assert result.is_correct and result.corrected_code is None


def test_review_split_survives_marker_phrase_in_explanation(monkeypatch):
    reply = (
        "The function is missing a colon. Below the line `Corrected Code:` you will find the fix.\n"
        "Severity: Low.\n\nCorrected Code:\n```python\ndef f():\n    return 1\n```"
    )
    result = _review(monkeypatch, reply)
    assert result.corrected_code == "def f():\n    return 1"


# --------------------------------------------------------------------------
# Chat and model gateway (2)
# --------------------------------------------------------------------------
def test_chat_forwards_only_last_seven_turns(monkeypatch):
    seen = {}
    monkeypatch.setattr(chat, "generate", lambda contents, *a, **k: seen.setdefault("c", contents) and "ok")
    history = [chat.ChatTurn(role="user" if i % 2 == 0 else "ai", text=str(i)) for i in range(30)]
    asyncio.run(chat.chat_with_ai(chat.ChatRequest(message="now", history=history)))
    assert len(seen["c"]) == 7 * 2 + 1
    assert seen["c"][0]["parts"] == ["16"]


def test_gateway_turns_empty_reply_into_502(monkeypatch):
    class Empty:
        text = ""
        prompt_feedback = type("F", (), {"block_reason": "SAFETY"})()

    class Model:
        def __init__(self, **kwargs):
            pass

        def generate_content(self, prompt):
            return Empty()

    monkeypatch.setattr(core.genai, "GenerativeModel", Model)
    with pytest.raises(HTTPException) as exc:
        core.generate("hi", "sys")
    assert exc.value.status_code == 502 and "SAFETY" in exc.value.detail


# --------------------------------------------------------------------------
# Access control (1)
# --------------------------------------------------------------------------
def test_api_rejects_request_without_sign_in_token(client, monkeypatch):
    monkeypatch.setattr(chat, "generate", lambda *a, **k: "answer")
    r = client.post("/api/chat", json={"message": "hi", "history": []})
    assert r.status_code == 401
