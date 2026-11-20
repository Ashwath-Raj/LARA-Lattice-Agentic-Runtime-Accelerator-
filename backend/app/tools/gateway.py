import hashlib
import time
from typing import Dict, Any, List, Optional
from backend.app.core.config import settings
from backend.app.core.errors import PolicyDeniedError, ValidationError, SandboxError, NotFoundError
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

        # 2. Verify Task Ownership and Delegation Scope
        if not self.repo:
            from backend.app.repositories.base import get_repository
            self.repo = get_repository()

        task = self.repo.get("tasks", task_id)
        if not task:
            raise NotFoundError(f"Task '{task_id}' not found for sandbox execution")

        if task.get("tenant_id") != principal.tenant_id:
            raise PolicyDeniedError("Cross-tenant sandbox execution is forbidden")

        if task.get("created_by") != principal.principal_id and "runtime_admin" not in principal.roles:
            raise PolicyDeniedError("Sandbox execution can only be initiated by the task creator or runtime administrator")

        # 3. Policy Authorization
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

        # 4. Input Validation against strictly enforced security boundaries
        if language not in settings.SANDBOX_ALLOWED_LANGUAGES:
            raise ValidationError(f"Language '{language}' is not in allowed sandbox languages: {settings.SANDBOX_ALLOWED_LANGUAGES}")

        if len(source.encode("utf-8")) > 65536:  # 64 KB limit
            raise ValidationError("Source code exceeds maximum permitted size of 64 KB")

        # Tests validation: limit test count and input size
        tests = tests or [{"stdin": "", "expected_stdout": ""}]
        if len(tests) > 10:
            raise ValidationError(f"Test case count {len(tests)} exceeds maximum allowed of 10")
        for idx, t in enumerate(tests):
            if not isinstance(t, dict):
                raise ValidationError(f"Test case {idx} must be an object")
            stdin_val = t.get("stdin", "")
            if len(stdin_val.encode("utf-8")) > 32768:  # 32 KB limit
                raise ValidationError(f"Test case {idx} stdin exceeds maximum allowed size of 32 KB")
            if len(t.get("expected_stdout", "").encode("utf-8")) > 32768:
                raise ValidationError(f"Test case {idx} expected_stdout exceeds maximum allowed size of 32 KB")

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

        # 5. Construct server-side validated payload for goboxd
        payload: Dict[str, Any] = {
            "language": language,
            "source": source,
            "tests": tests
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
        """Safe bounded arithmetic calculator using AST parsing and tree evaluation.
        Allows only numeric constants and basic binary/unary arithmetic operators (+, -, *, /).
        Rejects calls, variables, attributes, imports, and expressions > 200 chars.
        """
        decision = self.policy.evaluate(principal, "tool.calculate", "tool:calculator-safe", "calculation")
        if decision.decision != PolicyDecisionEnum.ALLOW:
            raise PolicyDeniedError("Policy denied calculator access")

        if len(expression) > 200:
            raise ValidationError("Expression exceeds maximum allowed length of 200 characters")

        import ast
        import operator

        try:
            tree = ast.parse(expression.strip(), mode="eval")
        except SyntaxError as e:
            raise ValidationError(f"Invalid arithmetic expression syntax: {str(e)}")

        allowed_operators = {
            ast.Add: operator.add,
            ast.Sub: operator.sub,
            ast.Mult: operator.mul,
            ast.Div: operator.truediv,
            ast.USub: operator.neg,
            ast.UAdd: operator.pos,
        }

        def eval_node(node):
            if isinstance(node, ast.Expression):
                return eval_node(node.body)
            elif isinstance(node, ast.Constant):
                if isinstance(node.value, (int, float)):
                    return node.value
                raise ValidationError("Only numeric constants are allowed in calculation")
            elif isinstance(node, ast.BinOp):
                op_type = type(node.op)
                if op_type not in allowed_operators:
                    raise ValidationError(f"Operator {op_type.__name__} is not allowed")
                left = eval_node(node.left)
                right = eval_node(node.right)
                if op_type == ast.Div and right == 0:
                    raise ValidationError("Division by zero is undefined")
                return allowed_operators[op_type](left, right)
            elif isinstance(node, ast.UnaryOp):
                op_type = type(node.op)
                if op_type not in allowed_operators:
                    raise ValidationError(f"Unary operator {op_type.__name__} is not allowed")
                operand = eval_node(node.operand)
                return allowed_operators[op_type](operand)
            else:
                raise ValidationError(f"Disallowed AST element: {type(node).__name__}")

        res = eval_node(tree)
        return {"expression": expression, "result": res, "status": "SUCCESS"}

    def list_tools(self, principal: Optional[Principal] = None) -> List[Dict[str, Any]]:
        """Return the catalog of declared tools with input schemas and risk classifications."""
        tools = [
            {
                "tool_id": "tool:calculator-safe",
                "name": "Safe Arithmetic Calculator",
                "description": "Bounded AST-parsed arithmetic evaluation (+, -, *, /).",
                "risk_level": "LOW",
                "execution_mode": "IN_PROCESS",
                "requires_approval": False,
                "input_schema": {"expression": "string"},
                "action": "tool.calculate"
            },
            {
                "tool_id": "tool:goboxd-sandbox",
                "name": "goboxd Linux Isolation Sandbox",
                "description": "Secure multi-tenant code execution in isolated nsjail/cgroup v2 sandbox.",
                "risk_level": "HIGH",
                "execution_mode": "REMOTE_SANDBOX",
                "requires_approval": False,
                "input_schema": {"language": "string", "source": "string", "tests": "array"},
                "action": "sandbox.execute"
            },
            {
                "tool_id": "tool:maintenance-request",
                "name": "Simulated Maintenance Request Connector",
                "description": "Drafts and executes simulated maintenance records. Requires Supervisor approval.",
                "risk_level": "CONSEQUENTIAL",
                "execution_mode": "SIMULATED_CONNECTOR",
                "requires_approval": True,
                "input_schema": {"asset_id": "string", "reason": "string", "urgency": "string"},
                "action": "maintenance_request.create_simulated"
            },
            {
                "tool_id": "source.read_authorized",
                "name": "Authorized Knowledge Source Reader",
                "description": "Retrieves permission-filtered knowledge source records with cryptographic provenance.",
                "risk_level": "READ",
                "execution_mode": "IN_PROCESS",
                "requires_approval": False,
                "input_schema": {"query": "string"},
                "action": "source.read"
            },
            {
                "tool_id": "tool:equipment-control",
                "name": "Physical Equipment Actuator",
                "description": "Direct physical equipment control or shutdown. CONSTITUTIONALLY PROHIBITED.",
                "risk_level": "PROHIBITED",
                "execution_mode": "DISALLOWED",
                "requires_approval": False,
                "input_schema": {},
                "action": "equipment.control"
            }
        ]
        if principal:
            # Filter tools that principal is authorized to see/use
            return [t for t in tools if self.policy.evaluate(principal, t["action"], t["tool_id"], "inspection").decision != PolicyDecisionEnum.DENY or t["requires_approval"]]
        return tools

    async def execute_tool(
        self,
        tool_id: str,
        arguments: Optional[Dict[str, Any]] = None,
        principal: Optional[Principal] = None,
        task_id: Optional[str] = "task_governed",
        parameters: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """Central governed execution route for tools, enforcing invocation-time RBAC/ABAC."""
        start_time = time.time()
        arguments = arguments if arguments is not None else (parameters or {})
        task_id = task_id or "task_governed"


        if tool_id == "tool:equipment-control" or tool_id == "equipment.control":
            raise PolicyDeniedError(
                "Constitutional prohibition: physical actuation/equipment control is unsupported and strictly denied",
                code="CONSTITUTIONAL_PROHIBITION"
            )

        if tool_id in ["tool:calculator-safe", "calculator.safe"]:
            expr = arguments.get("expression", "")
            return self.execute_calculator(principal, task_id, expr)

        elif tool_id in ["tool:goboxd-sandbox", "sandbox.execute"]:
            return await self.execute_sandbox(
                principal=principal,
                task_id=task_id,
                language=arguments.get("language", "go"),
                source=arguments.get("source", ""),
                source_filename=arguments.get("source_filename"),
                artifact_filename=arguments.get("artifact_filename"),
                flags=arguments.get("flags"),
                tests=arguments.get("tests")
            )

        elif tool_id in ["tool:maintenance-request", "maintenance_request.create_simulated"]:
            import uuid
            from datetime import datetime, timezone
            # Check policy for maintenance request
            decision = self.policy.evaluate(
                principal=principal,
                action="maintenance_request.create_simulated",
                resource_id="tool:maintenance-request",
                purpose="maintenance_drafting",
                context=arguments
            )

            now = datetime.now(timezone.utc).isoformat()
            if decision.decision == PolicyDecisionEnum.REQUIRE_APPROVAL:
                approval_id = f"appr_{uuid.uuid4().hex[:10]}"
                if not self.repo:
                    from backend.app.repositories.base import get_repository
                    self.repo = get_repository()
                self.repo.set("approvals", approval_id, {
                    "approval_id": approval_id,
                    "task_id": task_id,
                    "tenant_id": principal.tenant_id,
                    "action": "maintenance_request.execute",
                    "requested_by": principal.principal_id,
                    "status": "PENDING",
                    "created_at": now,
                    "details": arguments
                })
                self.audit.record_event(
                    event_type="APPROVAL_REQUESTED",
                    principal_id=principal.principal_id,
                    task_id=task_id,
                    action="maintenance_request.create_simulated",
                    policy_decision="REQUIRE_APPROVAL",
                    reason_code="HIGH_RISK_ACTION_REQUIRES_SUPERVISOR_APPROVAL",
                    details={"approval_id": approval_id, "arguments": arguments}
                )
                return {
                    "status": "REQUIRE_APPROVAL",
                    "approval_id": approval_id,
                    "message": "Action requires Supervisor approval prior to execution."
                }
            elif decision.decision == PolicyDecisionEnum.ALLOW:
                return {
                    "status": "SIMULATED_SUCCESS",
                    "label": "SIMULATED",
                    "action": "maintenance_request.create_simulated",
                    "executed_at": now,
                    "details": arguments
                }
            else:
                raise PolicyDeniedError(f"Tool execution denied: {decision.reason_code}")

        elif tool_id == "source.read_authorized":
            from backend.app.services.highways import HighwayResolver
            highways = HighwayResolver(self.repo, self.policy)
            query = arguments.get("query", "")
            return highways.retrieve_evidence(query=query, principal=principal, task_id=task_id).model_dump()

        else:
            raise NotFoundError(f"Tool '{tool_id}' is not recognized in the tool registry")
