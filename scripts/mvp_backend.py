#!/usr/bin/env python3
import json
import os
import re
import subprocess
import threading
import time
import uuid
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlparse

def env_first(*names: str, default: str) -> str:
    for name in names:
        value = os.environ.get(name)
        if value:
            return value
    return default


HOST = env_first(
    "HERMES_WEBUI_BACKEND_HOST",
    "HERMES_AGENT_WEBUI_BACKEND_HOST",
    "HERMES_CONTROL_CENTER_BACKEND_HOST",
    default="127.0.0.1",
)
PORT = int(
    env_first(
        "HERMES_WEBUI_BACKEND_PORT",
        "HERMES_AGENT_WEBUI_BACKEND_PORT",
        "HERMES_CONTROL_CENTER_BACKEND_PORT",
        default="9119",
    )
)
STORE_DIR = Path(
    env_first(
        "HERMES_WEBUI_BACKEND_STATE",
        "HERMES_AGENT_WEBUI_BACKEND_STATE",
        "HERMES_CONTROL_CENTER_BACKEND_STATE",
        default="~/.hermes/hermes-agent-webui-mvp",
    )
).expanduser()
SESSIONS_DIR = STORE_DIR / "sessions"
COMMAND_TIMEOUT_SECONDS = int(
    env_first(
        "HERMES_WEBUI_BACKEND_COMMAND_TIMEOUT",
        "HERMES_AGENT_WEBUI_BACKEND_COMMAND_TIMEOUT",
        "HERMES_CONTROL_CENTER_BACKEND_COMMAND_TIMEOUT",
        default="180",
    )
)
ALLOWED_ORIGINS = {
    origin.strip()
    for origin in env_first(
        "HERMES_WEBUI_BACKEND_ALLOWED_ORIGINS",
        "HERMES_AGENT_WEBUI_BACKEND_ALLOWED_ORIGINS",
        "HERMES_CONTROL_CENTER_BACKEND_ALLOWED_ORIGINS",
        default="",
    ).split(",")
    if origin.strip()
}
LOCK = threading.Lock()


def now_ts() -> int:
    return int(time.time())


def ensure_dirs() -> None:
    SESSIONS_DIR.mkdir(parents=True, exist_ok=True)


def session_path(session_id: str) -> Path:
    safe = re.sub(r"[^a-zA-Z0-9_-]", "", session_id)
    return SESSIONS_DIR / f"{safe}.json"


def delete_session(session_id: str) -> bool:
    path = session_path(session_id)
    if not path.exists():
        return False
    path.unlink()
    return True


def load_session(session_id: str):
    path = session_path(session_id)
    if not path.exists():
        return None
    return json.loads(path.read_text(encoding="utf-8"))


def save_session(data: dict) -> None:
    path = session_path(data["session_id"])
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")


def list_sessions():
    sessions = []
    for path in SESSIONS_DIR.glob("*.json"):
        try:
            sessions.append(json.loads(path.read_text(encoding="utf-8")))
        except (json.JSONDecodeError, OSError):
            continue
    sessions.sort(key=lambda item: item.get("updated_at", 0), reverse=True)
    return sessions


def build_session_payload(session: dict) -> dict:
    return {
        "session_id": session["session_id"],
        "title": session.get("title"),
        "workspace": session.get("workspace"),
        "model": session.get("model"),
        "message_count": len(session.get("messages", [])),
        "created_at": session.get("created_at", now_ts()),
        "updated_at": session.get("updated_at", now_ts()),
    "source": "webui-mvp",
        "input_tokens": session.get("input_tokens", 0),
        "output_tokens": session.get("output_tokens", 0),
        "tool_calls": session.get("tool_calls", []),
        "messages": session.get("messages", []),
    }


def build_session_summary(session: dict) -> dict:
    messages = session.get("messages", [])
    preview = None
    tool_call_count = 0
    for message in reversed(messages):
        if preview is None and message.get("role") != "system":
            content = normalize_content(message.get("content"))
            if content:
                preview = content
        tool_call_count += len(message.get("tool_calls") or [])
    created_at = int(session.get("created_at", now_ts()))
    updated_at = int(session.get("updated_at", created_at))
    return {
        "id": session["session_id"],
        "source": "webui-mvp",
        "workspace": session.get("workspace"),
        "model": session.get("model"),
        "title": session.get("title"),
        "started_at": created_at,
        "ended_at": None,
        "last_active": updated_at,
        "is_active": False,
        "message_count": len(messages),
        "tool_call_count": tool_call_count,
        "input_tokens": session.get("input_tokens", 0),
        "output_tokens": session.get("output_tokens", 0),
        "preview": preview,
    }


def normalize_content(content):
    if isinstance(content, str):
        return content
    if isinstance(content, list):
        parts = []
        for item in content:
            if isinstance(item, str):
                parts.append(item)
            elif isinstance(item, dict) and isinstance(item.get("text"), str):
                parts.append(item["text"])
        return "\n".join(parts).strip() or None
    return None


def derive_title(messages):
    for message in messages:
        if message.get("role") == "user":
            content = normalize_content(message.get("content"))
            if content:
                return content[:64]
    return "New chat"


def export_hermes_session(hermes_session_id: str) -> dict:
    env = os.environ.copy()
    env["TERM"] = "dumb"
    proc = subprocess.run(
        ["hermes", "sessions", "export", "-", "--session-id", hermes_session_id],
        text=True,
        capture_output=True,
        check=True,
        env=env,
        timeout=COMMAND_TIMEOUT_SECONDS,
    )
    lines = [line for line in proc.stdout.splitlines() if line.strip()]
    if not lines:
        raise RuntimeError("hermes sessions export returned no data")
    return json.loads(lines[0])


def sync_from_hermes(session: dict, exported: dict) -> dict:
    messages = []
    for message in exported.get("messages", []):
        role = message.get("role")
        if role not in {"user", "assistant", "system", "tool"}:
            continue
        messages.append(
            {
                "role": role,
                "content": normalize_content(message.get("content")),
                "timestamp": int(message.get("timestamp") or now_ts()),
                "tool_calls": message.get("tool_calls") or None,
                "tool_name": message.get("tool_name") or None,
                "tool_call_id": message.get("tool_call_id") or None,
            }
        )
    session["hermes_session_id"] = exported.get("id") or session.get("hermes_session_id")
    session["messages"] = messages
    session["model"] = exported.get("model") or session.get("model")
    session["title"] = exported.get("title") or derive_title(messages)
    session["input_tokens"] = int(exported.get("input_tokens") or 0)
    session["output_tokens"] = int(exported.get("output_tokens") or 0)
    session["updated_at"] = now_ts()
    return session


def run_hermes_chat(session: dict, message: str, model: str | None, workspace: str | None):
    cwd = str(Path(workspace or session.get("workspace") or "/root").expanduser())
    command = ["hermes", "chat", "-Q", "-q", message, "--source", "tool"]
    resume_id = session.get("hermes_session_id")
    if resume_id:
        command.extend(["--resume", resume_id])
    if model or session.get("model"):
        command.extend(["--model", model or session.get("model")])
    env = os.environ.copy()
    env["TERM"] = "dumb"
    proc = subprocess.run(command, cwd=cwd, text=True, capture_output=True, env=env, timeout=COMMAND_TIMEOUT_SECONDS)
    if proc.returncode != 0:
        raise RuntimeError(proc.stderr.strip() or proc.stdout.strip() or "hermes chat failed")
    match = re.findall(r"session_id:\s*(\S+)", proc.stdout)
    if not match:
        raise RuntimeError(f"unable to parse hermes session id from output: {proc.stdout!r}")
    hermes_session_id = match[-1]
    exported = export_hermes_session(hermes_session_id)
    answer = ""
    for item in reversed(exported.get("messages", [])):
        if item.get("role") == "assistant":
            answer = normalize_content(item.get("content")) or ""
            break
    return hermes_session_id, exported, answer


class Handler(BaseHTTPRequestHandler):
    server_version = "HermesAgentWebUI/0.1"

    def log_message(self, fmt, *args):
        pass

    def _origin(self) -> str | None:
        return self.headers.get("Origin")

    def _is_origin_allowed(self) -> bool:
        origin = self._origin()
        if not origin:
            return True
        return origin in ALLOWED_ORIGINS

    def _read_json(self):
        length = int(self.headers.get("Content-Length", "0") or 0)
        if length <= 0:
            return {}
        raw = self.rfile.read(length)
        return json.loads(raw.decode("utf-8")) if raw else {}

    def _send(self, status: int, payload: dict | list):
        body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        try:
            self.send_response(status)
            self.send_header("Content-Type", "application/json; charset=utf-8")
            self.send_header("Content-Length", str(len(body)))
            origin = self._origin()
            if origin and origin in ALLOWED_ORIGINS:
                self.send_header("Access-Control-Allow-Origin", origin)
                self.send_header("Vary", "Origin")
                self.send_header("Access-Control-Allow-Headers", "Content-Type")
                self.send_header("Access-Control-Allow-Methods", "GET,POST,DELETE,OPTIONS")
            self.end_headers()
            self.wfile.write(body)
        except (BrokenPipeError, ConnectionResetError):
            return

    def do_OPTIONS(self):
        if not self._is_origin_allowed():
            self._send(403, {"error": "origin not allowed"})
            return
        self._send(200, {"ok": True})

    def do_GET(self):
        parsed = urlparse(self.path)
        try:
            if not self._is_origin_allowed():
                self._send(403, {"error": "origin not allowed"})
                return
            if parsed.path == "/api/status":
                self._send(
                    200,
                    {
                        "active_sessions": len(list_sessions()),
                        "config_path": str(STORE_DIR / "config.json"),
                        "config_version": 1,
                        "env_path": str(Path("~/.hermes/.env").expanduser()),
                        "gateway_exit_reason": None,
                        "gateway_pid": None,
                        "gateway_platforms": {},
                        "gateway_running": False,
                        "gateway_state": "mvp-adapter",
                        "gateway_updated_at": None,
                        "hermes_home": str(Path("~/.hermes").expanduser()),
                        "latest_config_version": 1,
                        "release_date": time.strftime("%Y-%m-%d"),
                        "version": "webui-mvp-adapter",
                    },
                )
                return
            if parsed.path == "/api/sessions":
                self._send(200, [build_session_summary(item) for item in list_sessions()])
                return
            match = re.fullmatch(r"/api/sessions/([^/]+)/messages", parsed.path)
            if match:
                session = load_session(match.group(1))
                if not session:
                    self._send(404, {"error": "session not found"})
                    return
                self._send(200, {"session_id": session["session_id"], "messages": session.get("messages", [])})
                return
            self._send(404, {"error": "not found"})
        except Exception as exc:
            self._send(500, {"error": str(exc)})

    def do_POST(self):
        parsed = urlparse(self.path)
        try:
            if not self._is_origin_allowed():
                self._send(403, {"error": "origin not allowed"})
                return
            body = self._read_json()
            if parsed.path == "/api/session/new":
                session = {
                    "session_id": f"mvp_{uuid.uuid4().hex[:12]}",
                    "hermes_session_id": None,
                    "title": "New chat",
                    "workspace": str(Path(body.get("workspace") or "/root").expanduser()),
                    "model": body.get("model") or None,
                    "created_at": now_ts(),
                    "updated_at": now_ts(),
                    "input_tokens": 0,
                    "output_tokens": 0,
                    "messages": [],
                    "tool_calls": [],
                }
                with LOCK:
                    save_session(session)
                self._send(200, {"session": build_session_payload(session)})
                return
            if parsed.path == "/api/chat":
                session_id = body.get("session_id")
                message = str(body.get("message") or "").strip()
                if not session_id or not message:
                    self._send(400, {"error": "session_id and message are required"})
                    return
                with LOCK:
                    session = load_session(session_id)
                    if not session:
                        self._send(404, {"error": "session not found"})
                        return
                    if body.get("workspace"):
                        session["workspace"] = str(Path(body["workspace"]).expanduser())
                    if body.get("model"):
                        session["model"] = body["model"]
                    hermes_session_id, exported, answer = run_hermes_chat(
                        session,
                        message,
                        body.get("model"),
                        body.get("workspace"),
                    )
                    session = sync_from_hermes(session, exported)
                    session["hermes_session_id"] = hermes_session_id
                    save_session(session)
                self._send(
                    200,
                    {
                        "answer": answer,
                        "status": "done",
                        "session": build_session_payload(session),
                        "result": {"hermes_session_id": hermes_session_id},
                    },
                )
                return
            self._send(404, {"error": "not found"})
        except subprocess.CalledProcessError as exc:
            self._send(500, {"error": exc.stderr.strip() or exc.stdout.strip() or str(exc)})
        except subprocess.TimeoutExpired:
            self._send(504, {"error": f"hermes chat timed out after {COMMAND_TIMEOUT_SECONDS}s"})
        except Exception as exc:
            self._send(500, {"error": str(exc)})

    def do_DELETE(self):
        parsed = urlparse(self.path)
        try:
            if not self._is_origin_allowed():
                self._send(403, {"error": "origin not allowed"})
                return
            match = re.fullmatch(r"/api/sessions/([^/]+)", parsed.path)
            if not match:
                self._send(404, {"error": "not found"})
                return
            with LOCK:
                deleted = delete_session(match.group(1))
            if not deleted:
                self._send(404, {"error": "session not found"})
                return
            self._send(200, {"ok": True})
        except Exception as exc:
            self._send(500, {"error": str(exc)})


if __name__ == "__main__":
    ensure_dirs()
    try:
        httpd = ThreadingHTTPServer((HOST, PORT), Handler)
    except OSError as exc:
        if exc.errno == 98:
            raise SystemExit(
                f"Port {PORT} is already in use. Set HERMES_AGENT_WEBUI_BACKEND_PORT (or legacy HERMES_CONTROL_CENTER_BACKEND_PORT) to another port."
            ) from exc
        raise
    print(f"Hermes Agent WebUI MVP backend listening on http://{HOST}:{PORT}", flush=True)
    httpd.serve_forever()
