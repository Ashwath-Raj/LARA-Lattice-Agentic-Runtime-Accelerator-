import httpx
import logging
import hashlib
from typing import Dict, Any, List, Optional
from backend.app.core.config import settings
from backend.app.core.errors import SandboxError, SandboxUnavailableError, SandboxTimeoutError

logger = logging.getLogger(__name__)

class GoboxdClient:
    """Async HTTP client adapter communicating with the upstream goboxd execution daemon on a dedicated VM."""

    def __init__(self, base_url: Optional[str] = None, timeout: Optional[float] = None, auth_token: Optional[str] = None):
        self.base_url = (base_url or settings.GOBOXD_BASE_URL).rstrip("/")
        self.timeout = timeout or settings.GOBOXD_TIMEOUT_SECONDS
        self.auth_token = auth_token or settings.GOBOXD_INTERNAL_AUTH_TOKEN

    async def check_health(self) -> Dict[str, Any]:
        """Probe /healthz or /readyz on the goboxd server."""
        url = f"{self.base_url}/readyz"
        headers = {"Authorization": f"Bearer {self.auth_token}"}
        try:
            async with httpx.AsyncClient(timeout=3.0, follow_redirects=False) as client:
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
            async with httpx.AsyncClient(timeout=3.0, follow_redirects=False) as client:
                res = await client.get(url, headers=headers)
                if res.status_code == 200:
                    return res.json()
                raise SandboxError(f"Failed to fetch goboxd info: {res.status_code}", status_code=res.status_code)
        except httpx.ConnectError:
            raise SandboxUnavailableError("goboxd execution daemon unreachable")
        except httpx.TimeoutException:
            raise SandboxTimeoutError("goboxd info request timed out")

    async def execute_run(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        """Post a validated RunRequest to goboxd /run endpoint."""
        url = f"{self.base_url}/run"
        headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {self.auth_token}"
        }
        try:
            async with httpx.AsyncClient(timeout=self.timeout, follow_redirects=False) as client:
                res = await client.post(url, json=payload, headers=headers)
                if res.status_code == 200:
                    return res.json()
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
