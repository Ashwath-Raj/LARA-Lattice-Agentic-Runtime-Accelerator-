import os
import ssl
import httpx
import logging
from typing import Dict, Any, List, Optional
from backend.app.core.config import settings
from backend.app.core.errors import SandboxError, SandboxUnavailableError, SandboxTimeoutError

logger = logging.getLogger(__name__)

class GoboxdClient:
    """Async HTTP client adapter communicating with the upstream goboxd execution daemon on a dedicated VM.
    Supports mTLS certificate authentication, strict Bearer-token verification, and fail-closed operation.
    """

    def __init__(
        self,
        base_url: Optional[str] = None,
        timeout: Optional[float] = None,
        auth_token: Optional[str] = None,
        ca_cert_path: Optional[str] = None,
        client_cert_path: Optional[str] = None,
        client_key_path: Optional[str] = None,
        transport: Optional[httpx.AsyncBaseTransport] = None
    ):
        self.base_url = (base_url or settings.GOBOXD_BASE_URL).rstrip("/")
        self.timeout = timeout or settings.GOBOXD_TIMEOUT_SECONDS
        self.auth_token = auth_token or settings.GOBOXD_INTERNAL_AUTH_TOKEN
        self.ca_cert_path = ca_cert_path or settings.GOBOXD_TLS_CA_CERT_PATH
        self.client_cert_path = client_cert_path or settings.GOBOXD_TLS_CLIENT_CERT_PATH
        self.client_key_path = client_key_path or settings.GOBOXD_TLS_CLIENT_KEY_PATH
        self.transport = transport

    def _get_ssl_context(self) -> Optional[ssl.SSLContext]:
        """Configure SSLContext for mTLS and strict CA validation if HTTPS is used."""
        if not self.base_url.startswith("https://"):
            return None

        ctx = ssl.create_default_context(ssl.Purpose.SERVER_AUTH)
        if self.ca_cert_path and os.path.exists(self.ca_cert_path):
            ctx.load_verify_locations(cafile=self.ca_cert_path)
            ctx.check_hostname = True
            ctx.verify_mode = ssl.CERT_REQUIRED

        if self.client_cert_path and self.client_key_path:
            if os.path.exists(self.client_cert_path) and os.path.exists(self.client_key_path):
                ctx.load_cert_chain(certfile=self.client_cert_path, keyfile=self.client_key_path)

        return ctx

    def _get_auth_headers(self) -> Dict[str, str]:
        token = self.auth_token or settings.GOBOXD_INTERNAL_AUTH_TOKEN
        if not token:
            raise SandboxError("Missing required GOBOXD_INTERNAL_AUTH_TOKEN: bearer token must not be empty", code="AUTH_TOKEN_MISSING", status_code=401)
        return {
            "Authorization": f"Bearer {token}",
            "User-Agent": "LARA-Runtime-ToolGateway/1.0"
        }

    async def check_health(self) -> Dict[str, Any]:
        """Probe /readyz on the goboxd server with authenticated Bearer token."""
        url = f"{self.base_url}/readyz"
        headers = self._get_auth_headers()
        ssl_ctx = self._get_ssl_context()
        try:
            async with httpx.AsyncClient(
                transport=self.transport,
                verify=ssl_ctx if ssl_ctx else True,
                timeout=3.0,
                follow_redirects=False
            ) as client:
                res = await client.get(url, headers=headers)
                if res.status_code == 200:
                    return res.json()
                elif res.status_code == 503:
                    return {"status": "degraded", "detail": res.json()}
                elif res.status_code == 401:
                    raise SandboxError("Authentication failed during health probe (invalid Bearer token)", code="GOBOXD_UNAUTHORIZED", status_code=401)
                raise SandboxError(f"Unexpected health status {res.status_code}", status_code=res.status_code)
        except ssl.SSLError as se:
            raise SandboxUnavailableError(f"TLS/mTLS handshake failure with goboxd daemon: {str(se)}")
        except httpx.ConnectError:
            raise SandboxUnavailableError("goboxd execution daemon is unreachable")
        except httpx.TimeoutException:
            raise SandboxTimeoutError("goboxd health probe timed out")
        except SandboxError:
            raise
        except Exception as e:
            raise SandboxError(f"Health probe failure: {str(e)}")

    async def get_info(self) -> Dict[str, Any]:
        """Query /info from goboxd with authenticated Bearer token."""
        url = f"{self.base_url}/info"
        headers = self._get_auth_headers()
        ssl_ctx = self._get_ssl_context()
        try:
            async with httpx.AsyncClient(
                transport=self.transport,
                verify=ssl_ctx if ssl_ctx else True,
                timeout=3.0,
                follow_redirects=False
            ) as client:
                res = await client.get(url, headers=headers)
                if res.status_code == 200:
                    return res.json()
                elif res.status_code == 401:
                    raise SandboxError("Authentication failed during info query (invalid Bearer token)", code="GOBOXD_UNAUTHORIZED", status_code=401)
                raise SandboxError(f"Failed to fetch goboxd info: {res.status_code}", status_code=res.status_code)
        except ssl.SSLError as se:
            raise SandboxUnavailableError(f"TLS/mTLS handshake failure with goboxd daemon: {str(se)}")
        except httpx.ConnectError:
            raise SandboxUnavailableError("goboxd execution daemon unreachable")
        except httpx.TimeoutException:
            raise SandboxTimeoutError("goboxd info request timed out")
        except SandboxError:
            raise
        except Exception as e:
            raise SandboxError(f"Info query failure: {str(e)}")

    async def execute_run(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        """Post a validated RunRequest to goboxd /run endpoint and validate response schema and output bounds."""
        # 1. Enforce administrative kill switch at adapter level
        if settings.GOBOXD_KILL_SWITCH:
            raise SandboxError("Sandbox execution disabled via administrative kill-switch", code="KILL_SWITCH_ACTIVE", status_code=403)

        url = f"{self.base_url}/run"
        headers = self._get_auth_headers()
        headers["Content-Type"] = "application/json"
        ssl_ctx = self._get_ssl_context()

        try:
            async with httpx.AsyncClient(
                transport=self.transport,
                verify=ssl_ctx if ssl_ctx else True,
                timeout=self.timeout,
                follow_redirects=False
            ) as client:
                res = await client.post(url, json=payload, headers=headers)
                if res.status_code == 200:
                    try:
                        data = res.json()
                    except Exception as je:
                        raise SandboxError(f"Malformed JSON response from goboxd daemon: {str(je)}", code="GOBOXD_MALFORMED_RESPONSE")

                    # Validate response schema
                    if not isinstance(data, dict) or "status" not in data:
                        raise SandboxError("Malformed response schema from goboxd daemon: missing 'status' field", code="GOBOXD_INVALID_SCHEMA")

                    # Enforce output byte limits on stdout/stderr
                    max_out = settings.SANDBOX_MAX_OUTPUT_BYTES
                    if "build" in data and isinstance(data["build"], dict):
                        b = data["build"]
                        if len(b.get("stdout", "").encode("utf-8")) > max_out:
                            b["stdout"] = b["stdout"][:max_out] + "... [TRUNCATED_OUTPUT_LIMIT]"
                        if len(b.get("stderr", "").encode("utf-8")) > max_out:
                            b["stderr"] = b["stderr"][:max_out] + "... [TRUNCATED_OUTPUT_LIMIT]"

                    if "tests" in data and isinstance(data["tests"], list):
                        for t in data["tests"]:
                            if isinstance(t, dict):
                                if len(t.get("stdout", "").encode("utf-8")) > max_out:
                                    t["stdout"] = t["stdout"][:max_out] + "... [TRUNCATED_OUTPUT_LIMIT]"
                                if len(t.get("stderr", "").encode("utf-8")) > max_out:
                                    t["stderr"] = t["stderr"][:max_out] + "... [TRUNCATED_OUTPUT_LIMIT]"

                    return data
                elif res.status_code == 400:
                    try:
                        err = res.json().get("error", {})
                        msg = err.get("message", "Validation error from goboxd")
                        code = err.get("code", "GOBOXD_VALIDATION_ERROR")
                    except Exception:
                        msg = "Validation error from goboxd"
                        code = "GOBOXD_VALIDATION_ERROR"
                    raise SandboxError(message=msg, code=code, status_code=400)
                elif res.status_code == 401:
                    raise SandboxError("Authentication failed against goboxd daemon: invalid Bearer token", code="GOBOXD_UNAUTHORIZED", status_code=401)
                elif res.status_code == 403:
                    raise SandboxError("Access forbidden by goboxd daemon", code="GOBOXD_FORBIDDEN", status_code=403)
                elif res.status_code == 429:
                    raise SandboxUnavailableError("goboxd worker concurrency limit reached (HTTP 429)", code="GOBOXD_RATE_LIMITED")
                elif res.status_code == 503:
                    raise SandboxUnavailableError("goboxd worker queue exhausted or degraded (HTTP 503)")
                raise SandboxError(f"goboxd returned unexpected HTTP {res.status_code}", status_code=res.status_code)

        except ssl.SSLError as se:
            raise SandboxUnavailableError(f"TLS/mTLS handshake failure with goboxd daemon: {str(se)}")
        except httpx.ConnectError:
            raise SandboxUnavailableError("goboxd sandbox execution daemon is unreachable")
        except httpx.TimeoutException:
            raise SandboxTimeoutError("Sandbox execution timed out on goboxd host")
        except SandboxError:
            raise
        except Exception as e:
            raise SandboxError(f"Sandbox client error: {str(e)}")
