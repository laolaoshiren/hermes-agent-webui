import contextlib
import http.client
import importlib.util
import json
import tempfile
import threading
import types
import unittest
from pathlib import Path
from unittest import mock


MODULE_PATH = Path(__file__).resolve().parents[1] / "scripts" / "mvp_backend.py"


def load_mvp_backend() -> types.ModuleType:
    spec = importlib.util.spec_from_file_location("test_mvp_backend_module", MODULE_PATH)
    module = importlib.util.module_from_spec(spec)
    assert spec and spec.loader
    spec.loader.exec_module(module)
    return module


class MVPBackendModuleTest(unittest.TestCase):
    def setUp(self) -> None:
        self.backend = load_mvp_backend()
        self.tempdir = tempfile.TemporaryDirectory()
        self.store_dir = Path(self.tempdir.name)
        self.sessions_dir = self.store_dir / "sessions"
        self.backend.STORE_DIR = self.store_dir
        self.backend.SESSIONS_DIR = self.sessions_dir
        self.backend.ensure_dirs()

    def tearDown(self) -> None:
        self.tempdir.cleanup()

    def test_build_session_summary_prefers_non_system_preview_and_counts_tool_calls(self) -> None:
        session = {
            "session_id": "sess-summary",
            "created_at": 10,
            "updated_at": 20,
            "messages": [
                {"role": "system", "content": "setup"},
                {"role": "assistant", "content": [{"text": "assistant preview"}]},
                {"role": "tool", "content": "tool output", "tool_calls": [{"id": "call-1"}]},
            ],
        }

        summary = self.backend.build_session_summary(session)

        self.assertEqual(summary["id"], "sess-summary")
        self.assertEqual(summary["preview"], "tool output")
        self.assertEqual(summary["tool_call_count"], 1)
        self.assertEqual(summary["message_count"], 3)
        self.assertEqual(summary["last_active"], 20)

    def test_sync_from_hermes_normalizes_messages_and_persists_tokens(self) -> None:
        session = {
            "session_id": "sess-sync",
            "created_at": 1,
            "updated_at": 1,
            "messages": [],
        }
        exported = {
            "id": "hermes-sync-1",
            "model": "anthropic/claude-sonnet-4.6",
            "input_tokens": 11,
            "output_tokens": 29,
            "messages": [
                {"role": "ignored", "content": "skip me"},
                {"role": "user", "content": [{"text": "First request"}], "timestamp": 101},
                {
                    "role": "assistant",
                    "content": ["Part one", {"text": "Part two"}],
                    "timestamp": 102,
                    "tool_calls": [{"id": "call-2", "function": {"name": "search_files", "arguments": "{}"}}],
                },
            ],
        }

        with mock.patch.object(self.backend, "now_ts", return_value=555):
            synced = self.backend.sync_from_hermes(session, exported)

        self.assertEqual(synced["hermes_session_id"], "hermes-sync-1")
        self.assertEqual(synced["model"], "anthropic/claude-sonnet-4.6")
        self.assertEqual(synced["title"], "First request")
        self.assertEqual(synced["input_tokens"], 11)
        self.assertEqual(synced["output_tokens"], 29)
        self.assertEqual(synced["updated_at"], 555)
        self.assertEqual(
            synced["messages"],
            [
                {
                    "role": "user",
                    "content": "First request",
                    "timestamp": 101,
                    "tool_calls": None,
                    "tool_name": None,
                    "tool_call_id": None,
                },
                {
                    "role": "assistant",
                    "content": "Part one\nPart two",
                    "timestamp": 102,
                    "tool_calls": [{"id": "call-2", "function": {"name": "search_files", "arguments": "{}"}}],
                    "tool_name": None,
                    "tool_call_id": None,
                },
            ],
        )

    def test_session_helpers_round_trip_and_sanitize_paths(self) -> None:
        session = {
            "session_id": "../sess:unsafe",
            "title": "Saved title",
            "workspace": "/root/hermes-control-center",
            "messages": [{"role": "assistant", "content": "saved"}],
            "created_at": 1,
            "updated_at": 2,
        }

        self.backend.save_session(session)
        saved_files = list(self.sessions_dir.glob("*.json"))

        self.assertEqual(len(saved_files), 1)
        self.assertEqual(saved_files[0].name, "sessunsafe.json")
        loaded = self.backend.load_session("../sess:unsafe")
        self.assertEqual(loaded["title"], "Saved title")
        self.assertTrue(self.backend.delete_session("../sess:unsafe"))
        self.assertIsNone(self.backend.load_session("../sess:unsafe"))


class MVPBackendHttpTest(unittest.TestCase):
    def setUp(self) -> None:
        self.backend = load_mvp_backend()
        self.tempdir = tempfile.TemporaryDirectory()
        self.store_dir = Path(self.tempdir.name)
        self.sessions_dir = self.store_dir / "sessions"
        self.backend.STORE_DIR = self.store_dir
        self.backend.SESSIONS_DIR = self.sessions_dir
        self.backend.ALLOWED_ORIGINS = set()
        self.backend.ensure_dirs()
        self.server = self.backend.ThreadingHTTPServer(("127.0.0.1", 0), self.backend.Handler)
        self.thread = threading.Thread(target=self.server.serve_forever, daemon=True)
        self.thread.start()

    def tearDown(self) -> None:
        with contextlib.suppress(Exception):
            self.server.shutdown()
        with contextlib.suppress(Exception):
            self.server.server_close()
        self.thread.join(timeout=2)
        self.tempdir.cleanup()

    def request(self, method: str, path: str, body: dict | None = None):
        connection = http.client.HTTPConnection(self.server.server_address[0], self.server.server_address[1], timeout=5)
        payload = json.dumps(body).encode("utf-8") if body is not None else None
        headers = {"Content-Type": "application/json"} if payload is not None else {}
        connection.request(method, path, body=payload, headers=headers)
        response = connection.getresponse()
        raw = response.read().decode("utf-8")
        data = json.loads(raw) if raw else None
        connection.close()
        return response.status, data

    def test_session_endpoints_create_list_fetch_and_delete(self) -> None:
        status, created = self.request("POST", "/api/session/new", {"model": "gpt-test", "workspace": "~/repo"})
        self.assertEqual(status, 200)
        session_payload = created["session"]
        session_id = session_payload["session_id"]

        self.assertTrue(session_id.startswith("mvp_"))
        self.assertEqual(session_payload["title"], "New chat")
        self.assertEqual(session_payload["workspace"], str(Path("~/repo").expanduser()))
        self.assertEqual(session_payload["model"], "gpt-test")
        self.assertEqual(session_payload["messages"], [])

        status, listed = self.request("GET", "/api/sessions")
        self.assertEqual(status, 200)
        self.assertEqual(len(listed), 1)
        self.assertEqual(listed[0]["id"], session_id)
        self.assertEqual(listed[0]["workspace"], str(Path("~/repo").expanduser()))
        self.assertEqual(listed[0]["preview"], None)
        self.assertEqual(listed[0]["source"], "control-center-mvp")

        status, messages = self.request("GET", f"/api/sessions/{session_id}/messages")
        self.assertEqual(status, 200)
        self.assertEqual(messages, {"session_id": session_id, "messages": []})

        status, deleted = self.request("DELETE", f"/api/sessions/{session_id}")
        self.assertEqual(status, 200)
        self.assertEqual(deleted, {"ok": True})

        status, missing = self.request("GET", f"/api/sessions/{session_id}/messages")
        self.assertEqual(status, 404)
        self.assertEqual(missing, {"error": "session not found"})

    def test_chat_endpoint_returns_normalized_session_payload_and_updates_saved_session(self) -> None:
        status, created = self.request("POST", "/api/session/new", {"model": "anthropic/claude-sonnet-4.6"})
        self.assertEqual(status, 200)
        session_id = created["session"]["session_id"]

        exported = {
            "id": "hermes-session-9",
            "model": "anthropic/claude-sonnet-4.6",
            "input_tokens": 12,
            "output_tokens": 34,
            "messages": [
                {"role": "user", "content": [{"text": "Need workspace-safe routing"}], "timestamp": 201},
                {
                    "role": "assistant",
                    "content": [{"text": "Done"}],
                    "timestamp": 202,
                    "tool_calls": [{"id": "call-1", "function": {"name": "search_files", "arguments": "{}"}}],
                },
            ],
        }

        with mock.patch.object(
            self.backend,
            "run_hermes_chat",
            return_value=("hermes-session-9", exported, "Done"),
        ) as run_hermes_chat, mock.patch.object(self.backend, "now_ts", return_value=999):
            status, response = self.request(
                "POST",
                "/api/chat",
                {
                    "session_id": session_id,
                    "message": "Need workspace-safe routing",
                    "workspace": "~/repo",
                    "model": "anthropic/claude-sonnet-4.6",
                },
            )

        self.assertEqual(status, 200)
        run_hermes_chat.assert_called_once()
        args = run_hermes_chat.call_args.args
        self.assertEqual(args[1], "Need workspace-safe routing")
        self.assertEqual(args[2], "anthropic/claude-sonnet-4.6")
        self.assertEqual(args[3], "~/repo")

        self.assertEqual(response["answer"], "Done")
        self.assertEqual(response["status"], "done")
        self.assertEqual(response["result"], {"hermes_session_id": "hermes-session-9"})
        self.assertEqual(response["session"]["session_id"], session_id)
        self.assertEqual(response["session"]["title"], "Need workspace-safe routing")
        self.assertEqual(response["session"]["message_count"], 2)
        self.assertEqual(response["session"]["input_tokens"], 12)
        self.assertEqual(response["session"]["output_tokens"], 34)
        self.assertEqual(response["session"]["messages"][-1]["content"], "Done")

        persisted = self.backend.load_session(session_id)
        self.assertEqual(persisted["workspace"], str(Path("~/repo").expanduser()))
        self.assertEqual(persisted["hermes_session_id"], "hermes-session-9")
        self.assertEqual(persisted["updated_at"], 999)
        self.assertEqual(persisted["messages"][-1]["tool_calls"][0]["id"], "call-1")


if __name__ == "__main__":
    unittest.main()
