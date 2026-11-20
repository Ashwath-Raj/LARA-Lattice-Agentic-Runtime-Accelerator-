import uuid
import asyncio
from datetime import datetime, timezone
from typing import Optional, Dict, Any, List
from backend.app.domain.models import Principal, TaskStatusEnum, PolicyDecisionEnum
from backend.app.repositories.base import get_repository
from backend.app.services.policy import PolicyEngine
from backend.app.services.highways import HighwayResolver
from backend.app.services.audit import AuditService
from backend.app.adapters.vertex_ai import get_model_adapter
from backend.app.core.errors import PolicyDeniedError

class OrchestratorService:
    def __init__(self, repo=None, policy_engine=None, highway_resolver=None, audit_service=None, model_adapter=None):
        self.repo = repo or get_repository()
        self.policy = policy_engine or PolicyEngine(self.repo)
        self.highways = highway_resolver or HighwayResolver(self.repo, self.policy)
        self.audit = audit_service or AuditService(self.repo)
        self.model = model_adapter or get_model_adapter()

    def create_task(self, principal: Principal, prompt: str, title: Optional[str] = None, incident_id: Optional[str] = None) -> Dict[str, Any]:
        # 1. Authorize task creation
        decision = self.policy.evaluate(principal, "task.create", "task:root", "incident_investigation")
        if decision.decision != PolicyDecisionEnum.ALLOW:
            raise PolicyDeniedError(message="Task creation denied by policy", details={"reason_code": decision.reason_code})

        task_id = f"tsk_{uuid.uuid4().hex[:12]}"
        trace_id = f"trc_{uuid.uuid4().hex[:16]}"
        now = datetime.now(timezone.utc).isoformat()

        task_record = {
            "task_id": task_id,
            "title": title or f"Investigation {incident_id or 'General'}",
            "prompt": prompt,
            "status": TaskStatusEnum.QUEUED.value,
            "trace_id": trace_id,
            "created_at": now,
            "updated_at": now,
            "created_by": principal.principal_id,
            "tenant_id": principal.tenant_id,
            "incident_id": incident_id,
            "result": None,
            "events": []
        }
        self.repo.set("tasks", task_id, task_record)

        # Audit initial creation
        self.audit.record_event(
            event_type="TASK_CREATED",
            principal_id=principal.principal_id,
            task_id=task_id,
            trace_id=trace_id,
            action="task.create",
            policy_decision="ALLOW",
            reason_code="PERMITTED_TASK_CREATION",
            details={"prompt_length": len(prompt)}
        )

        # Run workflow asynchronously / synchronously for prototype
        self.execute_task_pipeline(task_id, principal)

        return task_record

    def get_task(self, task_id: str) -> Optional[Dict[str, Any]]:
        return self.repo.get("tasks", task_id)

    def execute_task_pipeline(self, task_id: str, principal: Principal):
        task = self.repo.get("tasks", task_id)
        if not task:
            return

        trace_id = task["trace_id"]
        # Step 1: Routing
        self._update_task_status(task_id, TaskStatusEnum.ROUTING.value, trace_id, principal.principal_id)
        route_info = self.highways.resolve_routes(principal, task_id)
        
        self.audit.record_event(
            event_type="HIGHWAY_ROUTE_RESOLVED",
            principal_id=principal.principal_id,
            task_id=task_id,
            trace_id=trace_id,
            details={
                "permitted_sources": route_info["permitted_sources"],
                "permitted_tools": route_info["permitted_tools"],
                "graph_version": route_info["graph_version"]
            }
        )

        # Step 2: Delegating to Specialist Agents
        self._update_task_status(task_id, TaskStatusEnum.DELEGATING.value, trace_id, principal.principal_id)
        
        # In a real environment, this invokes the Research, Analysis, and Verification agents sequentially
        async def run_agents():
            research_res = await self.model.generate_structured("Research Agent v1", task["prompt"])
            analysis_res = await self.model.generate_structured("Analysis Agent v1", f"Evidence: {research_res}")
            verification_res = await self.model.generate_structured("Verification Agent v1", f"Findings: {analysis_res}")
            return research_res, analysis_res, verification_res

        try:
            loop = asyncio.get_running_loop()
        except RuntimeError:
            loop = None

        if loop and loop.is_running():
            import concurrent.futures
            with concurrent.futures.ThreadPoolExecutor() as pool:
                research_res, analysis_res, verification_res = pool.submit(lambda: asyncio.run(run_agents())).result()
        else:
            research_res, analysis_res, verification_res = asyncio.run(run_agents())


        # Step 3: Verification Check
        self._update_task_status(task_id, TaskStatusEnum.VERIFYING.value, trace_id, principal.principal_id)

        # Step 4: Determine if tool or action requires approval
        # If task prompt involves maintenance or repair, trigger simulated approval flow
        is_maintenance = "maintenance" in task["prompt"].lower() or "pump" in task["prompt"].lower()
        if is_maintenance:
            approval_id = f"appr_{uuid.uuid4().hex[:10]}"
            self.repo.set("approvals", approval_id, {
                "approval_id": approval_id,
                "task_id": task_id,
                "action": "maintenance_request.execute",
                "requested_by": principal.principal_id,
                "status": "PENDING",
                "created_at": datetime.now(timezone.utc).isoformat()
            })
            self._update_task_status(task_id, TaskStatusEnum.AWAITING_APPROVAL.value, trace_id, principal.principal_id, approvals=[approval_id])
            final_result = {
                "research": research_res,
                "analysis": analysis_res,
                "verification": verification_res,
                "action_status": "AWAITING_SUPERVISOR_APPROVAL",
                "approval_id": approval_id
            }
        else:
            self._update_task_status(task_id, TaskStatusEnum.COMPLETED.value, trace_id, principal.principal_id)
            final_result = {
                "research": research_res,
                "analysis": analysis_res,
                "verification": verification_res,
                "action_status": "COMPLETED"
            }

        self.repo.update("tasks", task_id, {
            "result": final_result,
            "updated_at": datetime.now(timezone.utc).isoformat()
        })

    def _update_task_status(self, task_id: str, status: str, trace_id: str, principal_id: str, approvals: Optional[List[str]] = None):
        updates: Dict[str, Any] = {
            "status": status,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }
        if approvals:
            updates["approvals"] = approvals
        self.repo.update("tasks", task_id, updates)
        self.audit.record_event(
            event_type="TASK_STATE_TRANSITION",
            principal_id=principal_id,
            task_id=task_id,
            trace_id=trace_id,
            details={"to_status": status}
        )
