#!/usr/bin/env python3
import json
import os
import re
import secrets
import subprocess
import threading
import time
import uuid
import hashlib
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlparse, parse_qs

HOST = os.environ.get("HERMES_CONTROL_CENTER_BACKEND_HOST", "127.0.0.1")
PORT = int(os.environ.get("HERMES_CONTROL_CENTER_BACKEND_PORT", "9119"))
STORE_DIR = Path(os.environ.get("HERMES_CONTROL_CENTER_BACKEND_STATE", "~/.hermes/control-center-mvp")).expanduser()
SESSIONS_DIR = STORE_DIR / "sessions"
COMMAND_TIMEOUT_SECONDS = int(os.environ.get("HERMES_CONTROL_CENTER_BACKEND_COMMAND_TIMEOUT", "180"))
ALLOWED_ORIGINS = {
    origin.strip()
    for origin in os.environ.get("HERMES_CONTROL_CENTER_BACKEND_ALLOWED_ORIGINS", "").split(",")
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
        except Exception:
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
        "source": "control-center-mvp",
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
        "source": "control-center-mvp",
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
    cwd = str(Path(workspace or session.get("workspace") or os.path.expanduser("~")).expanduser())
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


SESSION_TOKEN = secrets.token_hex(32)
CONFIG_PATH = Path(env_first("HERMES_AGENT_WEBUI_CONFIG", default="~/.hermes/config.yaml")).expanduser()
ENV_PATH = Path(env_first("HERMES_AGENT_WEBUI_ENV", default="~/.hermes/.env")).expanduser()
SKILLS_DIR = Path(env_first("HERMES_AGENT_WEBUI_SKILLS", default="~/.hermes/skills")).expanduser()
CRON_DIR = Path(env_first("HERMES_AGENT_WEBUI_CRON", default="~/.hermes/cron")).expanduser()


def load_config():
    try:
        import yaml
        if CONFIG_PATH.exists():
            return yaml.safe_load(CONFIG_PATH.read_text(encoding="utf-8")) or {}
    except Exception:
        pass
    # Fallback: return a sensible default config
    return {
        "model": {"default": "gpt-4", "provider": "openai"},
        "agent": {"max_turns": 90, "verbose": False},
        "toolsets": ["hermes-cli"],
    }


def load_config_raw():
    try:
        if CONFIG_PATH.exists():
            return CONFIG_PATH.read_text(encoding="utf-8")
    except Exception:
        pass
    return "# Hermes configuration\nmodel:\n  default: gpt-4\n  provider: openai\n"


def load_env_vars():
    result = {}
    try:
        if ENV_PATH.exists():
            for line in ENV_PATH.read_text(encoding="utf-8").splitlines():
                line = line.strip()
                if not line or line.startswith("#"):
                    continue
                if "=" in line:
                    key, _, value = line.partition("=")
                    key = key.strip()
                    value = value.strip().strip('"').strip("'")
                    is_sensitive = any(s in key.lower() for s in ("key", "token", "secret", "password", "api"))
                    result[key] = {
                        "is_set": True,
                        "redacted_value": "••••••" if is_sensitive else value[:40],
                        "description": f"Environment variable: {key}",
                        "url": None,
                        "category": "general",
                        "is_password": is_sensitive,
                        "tools": [],
                        "advanced": False,
                    }
    except Exception:
        pass
    # Also check common hermes env vars from os.environ
    for key in ("OPENAI_API_KEY", "ANTHROPIC_API_KEY", "NOUS_API_KEY", "HERMES_GATEWAY_TOKEN"):
        val = os.environ.get(key)
        if val and key not in result:
            result[key] = {
                "is_set": True,
                "redacted_value": "••••••",
                "description": f"System environment variable: {key}",
                "url": None,
                "category": "api-keys",
                "is_password": True,
                "tools": [],
                "advanced": False,
            }
    return result


def load_skills():
    skills = []
    try:
        if SKILLS_DIR.exists():
            for cat_dir in sorted(SKILLS_DIR.iterdir()):
                if not cat_dir.is_dir():
                    continue
                category = cat_dir.name
                for skill_file in sorted(cat_dir.glob("*.md")):
                    name = skill_file.stem
                    desc = ""
                    try:
                        text = skill_file.read_text(encoding="utf-8")
                        for line in text.splitlines():
                            line = line.strip()
                            if line and not line.startswith("#"):
                                desc = line[:120]
                                break
                    except Exception:
                        pass
                    skills.append({
                        "name": name,
                        "description": desc or f"Skill: {name}",
                        "category": category,
                        "enabled": True,
                    })
    except Exception:
        pass
    return skills


def load_cron_jobs():
    jobs = []
    try:
        output_dir = CRON_DIR / "output"
        if output_dir.exists():
            pass  # cron output files, not job definitions
        # Try to get cron jobs from hermes CLI
        try:
            proc = subprocess.run(
                ["hermes", "cron", "list", "--json"],
                text=True, capture_output=True, timeout=10,
            )
            if proc.returncode == 0:
                data = json.loads(proc.stdout)
                if isinstance(data, list):
                    return data
        except Exception:
            pass
    except Exception:
        pass
    return jobs


def load_logs(lines=100):
    log_dir = Path("~/.hermes/logs").expanduser()
    log_files = sorted(log_dir.glob("*.log"), key=lambda f: f.stat().st_mtime, reverse=True)
    if not log_files:
        return {"file": "", "lines": []}
    latest = log_files[0]
    try:
        all_lines = latest.read_text(encoding="utf-8").splitlines()
        return {"file": str(latest), "lines": all_lines[-lines:]}
    except Exception:
        return {"file": str(latest), "lines": []}


def load_analytics(days=7):
    return {
        "daily": [],
        "by_model": [],
        "totals": {
            "total_input": 0,
            "total_output": 0,
            "total_cache_read": 0,
            "total_reasoning": 0,
            "total_estimated_cost": 0,
            "total_actual_cost": 0,
            "total_sessions": len(list_sessions()),
        },
    }


class Handler(BaseHTTPRequestHandler):
    server_version = "HermesControlCenterMVP/0.1"

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
                        "version": "control-center-mvp-adapter",
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
            if parsed.path == "/api/logs":
                qs = parse_qs(parsed.query)
                lines = int(qs.get("lines", ["100"])[0])
                self._send(200, load_logs(lines))
                return
            if parsed.path.startswith("/api/analytics/usage"):
                qs = parse_qs(parsed.query)
                days = int(qs.get("days", ["7"])[0])
                self._send(200, load_analytics(days))
                return
            if parsed.path == "/api/config":
                self._send(200, load_config())
                return
            if parsed.path == "/api/config/defaults":
                self._send(200, {
                    "model": {"default": "gpt-4", "provider": "openai"},
                    "agent": {"max_turns": 90, "verbose": False, "reasoning_effort": "medium"},
                    "toolsets": ["hermes-cli"],
                })
                return
            if parsed.path == "/api/config/schema":
                self._send(200, {
                    "fields": {
                        "model.default": {"type": "string", "label": "Default Model", "category": "model"},
                        "model.provider": {"type": "string", "label": "Provider", "category": "model"},
                        "agent.max_turns": {"type": "number", "label": "Max Turns", "category": "agent"},
                        "agent.verbose": {"type": "boolean", "label": "Verbose", "category": "agent"},
                    },
                    "category_order": ["model", "agent", "toolsets"],
                })
                return
            if parsed.path == "/api/config/raw":
                self._send(200, {"yaml": load_config_raw()})
                return
            if parsed.path == "/api/env":
                self._send(200, load_env_vars())
                return
            if parsed.path == "/api/cron/jobs":
                self._send(200, load_cron_jobs())
                return
            if parsed.path == "/api/skills":
                self._send(200, load_skills())
                return
            if parsed.path == "/api/tools/toolsets":
                self._send(200, [
                    {"name": "hermes-cli", "label": "Hermes CLI", "description": "Core Hermes CLI tools", "enabled": True, "configured": True, "tools": ["chat", "sessions", "cron", "skills"]},
                ])
                return
            if parsed.path.startswith("/api/sessions/search"):
                qs = parse_qs(parsed.query)
                q = qs.get("q", [""])[0].lower()
                results = []
                for s in list_sessions():
                    title = (s.get("title") or "").lower()
                    if q in title:
                        results.append({
                            "session_id": s.get("id") or s.get("session_id"),
                            "snippet": s.get("preview") or s.get("title") or "",
                            "role": None,
                            "source": s.get("source"),
                            "model": s.get("model"),
                            "session_started": s.get("started_at") or s.get("created_at"),
                        })
                self._send(200, {"results": results})
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
            if parsed.path == "/api/auth/session-token":
                self._send(200, {"token": SESSION_TOKEN})
                return
            if parsed.path == "/api/session/new":
                session = {
                    "session_id": f"mvp_{uuid.uuid4().hex[:12]}",
                    "hermes_session_id": None,
                    "title": "New chat",
                    "workspace": str(Path(body.get("workspace") or os.path.expanduser("~")).expanduser()),
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
            if parsed.path == "/api/env/reveal":
                key = body.get("key", "")
                val = os.environ.get(key) or ""
                # Check auth
                auth = self.headers.get("Authorization", "")
                if auth != f"Bearer {SESSION_TOKEN}":
                    self._send(403, {"error": "invalid session token"})
                    return
                self._send(200, {"key": key, "value": val})
                return
            if parsed.path == "/api/cron/jobs":
                # Delegate to hermes cron add
                prompt = body.get("prompt", "")
                schedule = body.get("schedule", "0 9 * * *")
                name = body.get("name", f"webui-{uuid.uuid4().hex[:6]}")
                try:
                    proc = subprocess.run(
                        ["hermes", "cron", "add", "--prompt", prompt, "--schedule", schedule, "--name", name],
                        text=True, capture_output=True, timeout=15,
                    )
                    if proc.returncode == 0:
                        self._send(200, {"id": name, "name": name, "prompt": prompt, "schedule": schedule, "status": "enabled"})
                        return
                    self._send(500, {"error": proc.stderr.strip() or "failed to create cron job"})
                except Exception as e:
                    self._send(500, {"error": str(e)})
                return
            match = re.fullmatch(r"/api/cron/jobs/([^/]+)/pause", parsed.path)
            if match:
                try:
                    subprocess.run(["hermes", "cron", "pause", match.group(1)], text=True, capture_output=True, timeout=10)
                except Exception:
                    pass
                self._send(200, {"ok": True})
                return
            match = re.fullmatch(r"/api/cron/jobs/([^/]+)/resume", parsed.path)
            if match:
                try:
                    subprocess.run(["hermes", "cron", "resume", match.group(1)], text=True, capture_output=True, timeout=10)
                except Exception:
                    pass
                self._send(200, {"ok": True})
                return
            match = re.fullmatch(r"/api/cron/jobs/([^/]+)/trigger", parsed.path)
            if match:
                try:
                    subprocess.run(["hermes", "cron", "run", match.group(1)], text=True, capture_output=True, timeout=10)
                except Exception:
                    pass
                self._send(200, {"ok": True})
                return
            self._send(404, {"error": "not found"})
        except subprocess.CalledProcessError as exc:
            self._send(500, {"error": exc.stderr.strip() or exc.stdout.strip() or str(exc)})
        except subprocess.TimeoutExpired:
            self._send(504, {"error": f"hermes chat timed out after {COMMAND_TIMEOUT_SECONDS}s"})
        except Exception as exc:
            self._send(500, {"error": str(exc)})

    def do_PUT(self):
        parsed = urlparse(self.path)
        try:
            if not self._is_origin_allowed():
                self._send(403, {"error": "origin not allowed"})
                return
            body = self._read_json()
            if parsed.path == "/api/config":
                # Save structured config
                config = body.get("config", {})
                try:
                    import yaml
                    CONFIG_PATH.write_text(yaml.dump(config, allow_unicode=True, default_flow_style=False), encoding="utf-8")
                except Exception:
                    pass
                self._send(200, {"ok": True})
                return
            if parsed.path == "/api/config/raw":
                yaml_text = body.get("yaml_text", "")
                try:
                    CONFIG_PATH.write_text(yaml_text, encoding="utf-8")
                except Exception:
                    pass
                self._send(200, {"ok": True})
                return
            if parsed.path == "/api/env":
                key = body.get("key", "")
                value = body.get("value", "")
                if not key:
                    self._send(400, {"error": "key is required"})
                    return
                # Write to .env file
                try:
                    lines = []
                    found = False
                    if ENV_PATH.exists():
                        lines = ENV_PATH.read_text(encoding="utf-8").splitlines()
                    new_lines = []
                    for line in lines:
                        if line.strip().startswith(f"{key}="):
                            new_lines.append(f'{key}="{value}"')
                            found = True
                        else:
                            new_lines.append(line)
                    if not found:
                        new_lines.append(f'{key}="{value}"')
                    ENV_PATH.write_text("\n".join(new_lines) + "\n", encoding="utf-8")
                    os.environ[key] = value
                except Exception as e:
                    self._send(500, {"error": str(e)})
                    return
                self._send(200, {"ok": True})
                return
            if parsed.path == "/api/skills/toggle":
                self._send(200, {"ok": True})
                return
            self._send(404, {"error": "not found"})
        except Exception as exc:
            self._send(500, {"error": str(exc)})

    def do_DELETE(self):
        parsed = urlparse(self.path)
        try:
            if not self._is_origin_allowed():
                self._send(403, {"error": "origin not allowed"})
                return
            match = re.fullmatch(r"/api/sessions/([^/]+)", parsed.path)
            if match:
                with LOCK:
                    deleted = delete_session(match.group(1))
                if not deleted:
                    self._send(404, {"error": "session not found"})
                    return
                self._send(200, {"ok": True})
                return
            match = re.fullmatch(r"/api/cron/jobs/([^/]+)", parsed.path)
            if match:
                try:
                    subprocess.run(["hermes", "cron", "remove", match.group(1)], text=True, capture_output=True, timeout=10)
                except Exception:
                    pass
                self._send(200, {"ok": True})
                return
            if parsed.path == "/api/env":
                body = self._read_json()
                key = body.get("key", "")
                if key:
                    try:
                        if ENV_PATH.exists():
                            lines = ENV_PATH.read_text(encoding="utf-8").splitlines()
                            new_lines = [l for l in lines if not l.strip().startswith(f"{key}=")]
                            ENV_PATH.write_text("\n".join(new_lines) + "\n", encoding="utf-8")
                            os.environ.pop(key, None)
                    except Exception:
                        pass
                self._send(200, {"ok": True})
                return
            self._send(404, {"error": "not found"})
        except Exception as exc:
            self._send(500, {"error": str(exc)})


if __name__ == "__main__":
    ensure_dirs()
    httpd = ThreadingHTTPServer((HOST, PORT), Handler)
    print(f"Hermes Control Center MVP backend listening on http://{HOST}:{PORT}", flush=True)
    httpd.serve_forever()
