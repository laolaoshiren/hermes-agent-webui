#!/usr/bin/env python3
"""Static file server with API proxy for hermes-agent-webui."""
import os
import mimetypes
import urllib.request
import urllib.error
from http.server import HTTPServer, SimpleHTTPRequestHandler
from pathlib import Path

DIST = Path(__file__).parent / "dist"
BACKEND = os.environ.get("BACKEND_URL", "http://127.0.0.1:9119")
PORT = int(os.environ.get("SERVE_PORT", "4173"))

class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(DIST), **kwargs)

    def do_GET(self):
        if self.path.startswith("/api/") or self.path.startswith("/v1/"):
            self._proxy()
            return
        # SPA fallback: if file doesn't exist, serve index.html
        file_path = DIST / self.path.lstrip("/")
        if not file_path.exists() or file_path.is_dir():
            if not (self.path.startswith("/assets/") or self.path.endswith((".ico", ".svg", ".png", ".jpg", ".webp"))):
                self.path = "/index.html"
        super().do_GET()

    def do_POST(self):
        self._proxy()

    def do_DELETE(self):
        self._proxy()

    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET,POST,DELETE,OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.end_headers()

    def _proxy(self):
        url = f"{BACKEND}{self.path}"
        body = None
        if self.headers.get("Content-Length"):
            length = int(self.headers["Content-Length"])
            body = self.rfile.read(length)
        req = urllib.request.Request(url, data=body, method=self.command)
        if body:
            req.add_header("Content-Type", "application/json")
        try:
            with urllib.request.urlopen(req, timeout=180) as resp:
                resp_body = resp.read()
                self.send_response(resp.status)
                for key in ("Content-Type",):
                    val = resp.headers.get(key)
                    if val:
                        self.send_header(key, val)
                self.send_header("Access-Control-Allow-Origin", "*")
                self.send_header("Content-Length", str(len(resp_body)))
                self.end_headers()
                self.wfile.write(resp_body)
        except urllib.error.HTTPError as e:
            resp_body = e.read()
            self.send_response(e.code)
            self.send_header("Content-Type", "application/json")
            self.send_header("Access-Control-Allow-Origin", "*")
            self.send_header("Content-Length", str(len(resp_body)))
            self.end_headers()
            self.wfile.write(resp_body)
        except Exception as e:
            self.send_response(502)
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            self.wfile.write(f'{{"error": "{e}"}}'.encode())

    def end_headers(self):
        # Cache control for dev
        self.send_header("Cache-Control", "no-cache")
        super().end_headers()

if __name__ == "__main__":
    server = HTTPServer(("0.0.0.0", PORT), Handler)
    print(f"Serving on http://0.0.0.0:{PORT} (proxy → {BACKEND})", flush=True)
    server.serve_forever()
