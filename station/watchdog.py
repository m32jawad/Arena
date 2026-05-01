"""
Arena Station Watchdog

A minimal HTTP server (stdlib only) that runs independently on port 8002.
It allows the backend admin PC to restart the main arena-station service
even when main.py is not running.

Endpoints:
  GET  /health        — liveness check (no auth required)
  POST /restart       — restart arena-station.service (requires Bearer token)
  GET  /service-status — check whether arena-station.service is active (requires Bearer token)

Setup:
  1. Set WATCHDOG_TOKEN in station/.env (same value configured in backend settings).
  2. Install as a systemd service using arena-watchdog.service.
  3. Allow the watchdog user to restart arena-station without a password:
       echo 'pi ALL=(ALL) NOPASSWD: /bin/systemctl restart arena-station' \
         | sudo tee /etc/sudoers.d/arena-watchdog
"""

import json
import logging
import os
import subprocess
import sys
from http.server import BaseHTTPRequestHandler, HTTPServer
from pathlib import Path

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [watchdog] %(levelname)s %(message)s",
    stream=sys.stdout,
)
logger = logging.getLogger("watchdog")


# ---------------------------------------------------------------------------
# Token loading — reads .env in the same directory (no external deps needed)
# ---------------------------------------------------------------------------

def _load_env_token() -> str:
    env_path = Path(__file__).parent / ".env"
    if env_path.is_file():
        for line in env_path.read_text(encoding="utf-8").splitlines():
            line = line.strip()
            if line.startswith("WATCHDOG_TOKEN="):
                return line.split("=", 1)[1].strip().strip('"').strip("'")
    return os.environ.get("WATCHDOG_TOKEN", "")


WATCHDOG_TOKEN: str = _load_env_token()
WATCHDOG_PORT: int = int(os.environ.get("WATCHDOG_PORT", "8002"))
WATCHDOG_HOST: str = os.environ.get("WATCHDOG_HOST", "0.0.0.0")
SERVICE_NAME: str = os.environ.get("ARENA_SERVICE_NAME", "arena-station")


# ---------------------------------------------------------------------------
# HTTP handler
# ---------------------------------------------------------------------------

class WatchdogHandler(BaseHTTPRequestHandler):

    def log_message(self, fmt, *args):  # redirect to our logger
        logger.info(f"{self.address_string()} - {fmt % args}")

    # ---- helpers -----------------------------------------------------------

    def _send_json(self, status: int, body: dict):
        data = json.dumps(body).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(data)))
        self.end_headers()
        self.wfile.write(data)

    def _check_auth(self) -> bool:
        if not WATCHDOG_TOKEN:
            logger.warning("WATCHDOG_TOKEN is not configured — refusing all requests")
            return False
        auth = self.headers.get("Authorization", "")
        if not auth.startswith("Bearer "):
            return False
        provided = auth[len("Bearer "):]
        # Constant-time comparison to prevent timing attacks
        import hmac
        return hmac.compare_digest(provided, WATCHDOG_TOKEN)

    # ---- routes ------------------------------------------------------------

    def do_GET(self):
        if self.path == "/health":
            self._send_json(200, {"status": "watchdog running", "service": SERVICE_NAME})
        elif self.path == "/service-status":
            if not self._check_auth():
                self._send_json(401, {"error": "Unauthorized"})
                return
            try:
                result = subprocess.run(
                    ["systemctl", "is-active", SERVICE_NAME],
                    capture_output=True, text=True, timeout=5,
                )
                active = result.stdout.strip()  # e.g. "active", "inactive", "failed"
                self._send_json(200, {"service": SERVICE_NAME, "status": active})
            except Exception as exc:
                self._send_json(500, {"error": str(exc)})
        else:
            self._send_json(404, {"error": "Not found"})

    def do_POST(self):
        if self.path == "/restart":
            if not self._check_auth():
                self._send_json(401, {"error": "Unauthorized"})
                return
            logger.info(f"Restart requested for {SERVICE_NAME}")
            try:
                result = subprocess.run(
                    ["sudo", "systemctl", "restart", SERVICE_NAME],
                    capture_output=True, text=True, timeout=20,
                )
                if result.returncode == 0:
                    logger.info(f"{SERVICE_NAME} restarted successfully")
                    self._send_json(200, {"message": f"{SERVICE_NAME} restart triggered"})
                else:
                    err = result.stderr.strip() or f"exit code {result.returncode}"
                    logger.error(f"Restart failed: {err}")
                    self._send_json(500, {"error": err})
            except subprocess.TimeoutExpired:
                self._send_json(500, {"error": "systemctl restart timed out"})
            except Exception as exc:
                self._send_json(500, {"error": str(exc)})
        else:
            self._send_json(404, {"error": "Not found"})


# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    if not WATCHDOG_TOKEN:
        logger.error(
            "WATCHDOG_TOKEN is not set in .env or environment variables. "
            "The watchdog will refuse all authenticated requests. "
            "Set WATCHDOG_TOKEN in station/.env to enable remote restart."
        )

    logger.info(f"Starting watchdog on {WATCHDOG_HOST}:{WATCHDOG_PORT} (service={SERVICE_NAME})")
    server = HTTPServer((WATCHDOG_HOST, WATCHDOG_PORT), WatchdogHandler)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        logger.info("Watchdog stopped")
