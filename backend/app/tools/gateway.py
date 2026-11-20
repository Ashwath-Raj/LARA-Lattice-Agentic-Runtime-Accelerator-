import hashlib
import time
from typing import Dict, Any, List, Optional
from backend.app.core.config import settings
from backend.app.core.errors import PolicyDeniedError, ValidationError, SandboxError
from backend.app.domain.models import Principal, PolicyDecisionEnum
from backend.app.services.policy import PolicyEngine
from backend.app.services.audit import AuditService
from backend.app.adapters.goboxd import GoboxdClient

class ToolGateway:
    """Central governed gateway for all tool and sandbox execution."""

    def __init__(self, repo=None, policy_engine=None, audit_service=None, goboxd_client=None):
        self.repo = repo
        self.policy = policy_engine or PolicyEngine(self.repo)
        self.audit = audit_service or AuditService(self.repo)
        self.goboxd = goboxd_client or GoboxdClient()

    async def execute_sandbox(
        self,
        principal: Principal,
        task_id: str,
        language: str,
        source: str,
        source_filename: Optional[str] = None,
        artifact_filename: Optional[str] = None,
        flags: Optional[List[str]] = None,
        tests: Optional[List[Dict[str, str]]] = None,
        context: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        context = context or {}
        # 1. Check administrative kill switch
        if settings.GOBOXD_KILL_SWITCH:
            raise PolicyDeniedError("Sandbox execution is currently disabled via administrative kill-switch", code="KILL_SWITCH_ACTIVE")

        # 2. Policy Authorization
        decision = self.policy.evaluate(
            principal=principal,
            action="sandbox.execute",
            resource_id="tool:goboxd-sandbox",
            purpose="task_code_execution",
            context={"task_id": task_id}
        )
        if decision.decision != PolicyDecisionEnum.ALLOW:
            self.audit.record_event(
                event_type="SANDBOX_EXECUTION_DENIED",
                principal_id=principal.principal_id,
                task_id=task_id,
                action="sandbox.execute",
                policy_decision=decision.decision.value,
                reason_code=decision.reason_code,
                details={"language": language}
            )
            raise PolicyDeniedError(f"Sandbox execution denied: {decision.reason_code}")

        # 3. Input Validation against strictly enforced security boundaries
        if language not in settings.SANDBOX_ALLOWED_LANGUAGES:
            raise ValidationError(f"Language '{language}' is not in allowed sandbox languages: {settings.SANDBOX_ALLOWED_LANGUAGES}")

        if len(source.encode("utf-8")) > 65536:  # 64 KB limit
            raise ValidationError("Source code exceeds maximum permitted size of 64 KB")

        # Filename security validations matching upstream goboxd invariants
        def validate_filename(fn: Optional[str]):
            if not fn:
                return
            if len(fn) > 128:
                raise ValidationError("Filename exceeds 128 character limit")
            if fn.startswith("."):
                raise ValidationError("Filename cannot start with a dot (hidden files / traversal prohibited)")
            if "/" in fn or "\\" in fn:
                raise ValidationError("Filename cannot contain path separators")
            for ch in fn:
                if ord(ch) < 0x20 or ord(ch) == 0x7F:
                    raise ValidationError("Filename contains invalid control character")

        validate_filename(source_filename)
        validate_filename(artifact_filename)

        # Flag allowlist verification
        flags = flags or []
        allowed_flag_prefixes = ["-O0", "-O1", "-O2", "-O3", "-Wall", "-Wextra", "-std="]
        for f in flags:
            if not any(f == p or (p.endswith("=") and f.startswith(p)) for p in allowed_flag_prefixes):
                raise ValidationError(f"Compiler flag '{f}' is not in allowlist")

        # Compute content hash
        content_hash = f"sha256:{hashlib.sha256(source.encode('utf-8')).hexdigest()}"

        # 4. Construct server-side validated payload for goboxd
        payload: Dict[str, Any] = {
            "language": language,
            "source": source,
            "tests": tests or [{"stdin": "", "expected_stdout": ""}]
        }
        if source_filename:
            payload["source_filename"] = source_filename
        if artifact_filename:
            payload["artifact_filename"] = artifact_filename

        # Server-enforced limits (client cannot elevate)
        payload["run"] = {
            "limits": {
                "wall_time_s": min(settings.SANDBOX_MAX_WALL_TIME_S, 5),
                "memory_kb": min(settings.SANDBOX_MAX_MEMORY_KB, 524288),
                "max_processes": min(settings.SANDBOX_MAX_PROCESSES, 64)
            }
        }
        if flags:
            payload["build"] = {
                "flags": flags,
                "limits": {
                    "wall_time_s": 10,
                    "memory_kb": 1048576,
                    "max_processes": 100
                }
            }

        # 5. Execute via adapter with timing and error handling
        start_time = time.time()
        result = await self.goboxd.execute_run(payload)
        duration_ms = int((time.time() - start_time) * 1000)

        # 6. Audit recording
        self.audit.record_event(
            event_type="SANDBOX_EXECUTION_COMPLETED",
            principal_id=principal.principal_id,
            task_id=task_id,
            action="sandbox.execute",
            resource_id="tool:goboxd-sandbox",
            policy_decision="ALLOW",
            reason_code="EXECUTION_ACCEPTED",
            details={
                "language": language,
                "content_hash": content_hash,
                "duration_ms": duration_ms,
                "status": result.get("status")
            }
        )

        return {
            "status": result.get("status", "unknown"),
            "build": result.get("build"),
            "tests": result.get("tests", []),
            "content_hash": content_hash,
            "execution_time_ms": duration_ms
        }

    def execute_calculator(self, principal: Principal, task_id: str, expression: str) -> Dict[str, Any]:
        """Safe bounded arithmetic calculator tool."""
        decision = self.policy.evaluate(principal, "tool.calculate", "tool:calculator-safe", "calculation")
        if decision.decision != PolicyDecisionEnum.ALLOW:
            raise PolicyDeniedError("Policy denied calculator access")

        # Safe AST or strict character validation
        allowed_chars = set("0123456789+-*/(). \t")
        if not all(c in allowed_chars for c in expression):
            raise ValidationError("Expression contains invalid characters")

        try:
            # Safe eval of pure arithmetic
            code = compile(expression, "<string>", "eval")
            for name in code.co_names:
                raise ValidationError(f"Use of variable/function '{name}' is forbidden")
            res = eval(code, {"__builtins__": {}}, {})
            return {"expression": expression, "result": res, "status": "SUCCESS"}
        except Exception as e:
            raise ValidationError(f"Evaluation error: {str(e)}")
