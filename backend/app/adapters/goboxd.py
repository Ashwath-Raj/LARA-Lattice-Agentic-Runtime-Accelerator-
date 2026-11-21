import httpx
import logging
import hashlib
from typing import Dict, Any, List, Optional
from backend.app.core.config import settings
from backend.app.core.errors import SandboxError, SandboxUnavailableError, SandboxTimeoutError

logger = logging.getLogger(__name__)

class GoboxdClient:
    """Async HTTP client adapter communicating with the upstream goboxd execution daemon on a dedicated VM."""

    def __init__(
        self,
        base_url: Optional[str] = None,
        timeout: Optional[float] = None,
        auth_token: Optional[str] = None,
        transport: Optional[httpx.AsyncBaseTransport] = None
    ):
        self.base_url = (base_url or settings.GOBOXD_BASE_URL).rstrip("/")
        self.timeout = timeout or settings.GOBOXD_TIMEOUT_SECONDS
        self.auth_token = auth_token or settings.GOBOXD_INTERNAL_AUTH_TOKEN
        self.transport = transport

    async def check_health(self) -> Dict[str, Any]:
        """Probe /healthz or /readyz on the goboxd server."""
        url = f"{self.base_url}/readyz"
        headers = {"Authorization": f"Bearer {self.auth_token}"}
        try:
            async with httpx.AsyncClient(transport=self.transport, timeout=3.0, follow_redirects=False) as client:
                res = await client.get(url, headers=headers)
                if res.status_code == 200:
                    return res.json()
                elif res.status_code == 503:
                    return {"status": "degraded", "detail": res.json()}
                raise SandboxError(f"Unexpected health status {res.status_code}", status_code=res.status_code)
        except httpx.ConnectError:
            raise SandboxUnavailableError("goboxd execution daemon is unreachable")
        except httpx.TimeoutException:
            raise SandboxTimeoutError("goboxd health probe timed out")
        except Exception as e:
            raise SandboxError(f"Health probe failure: {str(e)}")

    async def get_info(self) -> Dict[str, Any]:
        """Query /info from goboxd."""
        url = f"{self.base_url}/info"
        headers = {"Authorization": f"Bearer {self.auth_token}"}
        try:
            async with httpx.AsyncClient(transport=self.transport, timeout=3.0, follow_redirects=False) as client:
                res = await client.get(url, headers=headers)
                if res.status_code == 200:
                    return res.json()
                raise SandboxError(f"Failed to fetch goboxd info: {res.status_code}", status_code=res.status_code)
        except httpx.ConnectError:
            raise SandboxUnavailableError("goboxd execution daemon unreachable")
        except httpx.TimeoutException:
            raise SandboxTimeoutError("goboxd info request timed out")

    async def execute_run(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        """Post a validated RunRequest to goboxd /run endpoint and validate response schema and output bounds."""
        # Enforce administrative kill switch at adapter level
        if settings.GOBOXD_KILL_SWITCH:
            raise SandboxError("Sandbox execution disabled via administrative kill-switch", code="KILL_SWITCH_ACTIVE", status_code=403)

        url = f"{self.base_url}/run"
        headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {self.auth_token}"
        }
        try:
            async with httpx.AsyncClient(transport=self.transport, timeout=self.timeout, follow_redirects=False) as client:
                res = await client.post(url, json=payload, headers=headers)
                if res.status_code == 200:
                    data = res.json()
                    # Validate response schema
                    if not isinstance(data, dict) or "status" not in data:
                        raise SandboxError("Malformed response schema from goboxd daemon: missing 'status' field")

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
                    err = res.json().get("error", {})
                    raise SandboxError(
                        message=err.get("message", "Validation error from goboxd"),
                        code=err.get("code", "GOBOXD_VALIDATION_ERROR"),
                        status_code=400
                    )
                elif res.status_code == 503:
                    raise SandboxUnavailableError("goboxd worker queue exhausted or degraded")
                raise SandboxError(f"goboxd returned HTTP {res.status_code}", status_code=res.status_code)
        except httpx.ConnectError:
            raise SandboxUnavailableError("goboxd sandbox execution daemon is unreachable")
        except httpx.TimeoutException:
            raise SandboxTimeoutError("Sandbox execution timed out on goboxd host")
        except SandboxError:
            raise
        except Exception as e:
            raise SandboxError(f"Sandbox client error: {str(e)}")
