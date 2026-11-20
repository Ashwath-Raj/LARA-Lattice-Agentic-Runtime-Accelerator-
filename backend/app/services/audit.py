import uuid
from datetime import datetime, timezone
from typing import Optional, Dict, Any, List
from backend.app.domain.models import AuditEvent
from backend.app.repositories.base import get_repository

class AuditService:
    def __init__(self, repo=None):
        self.repo = repo or get_repository()

    def record_event(
        self,
        event_type: str,
        principal_id: Optional[str] = None,
        task_id: Optional[str] = None,
        trace_id: Optional[str] = None,
        action: Optional[str] = None,
        resource_id: Optional[str] = None,
        policy_decision: Optional[str] = None,
        reason_code: Optional[str] = None,
        details: Optional[Dict[str, Any]] = None,
        tenant_id: str = "demo-enterprise"
    ) -> AuditEvent:
        event_id = f"evt_{uuid.uuid4().hex}"
        now = datetime.now(timezone.utc).isoformat()
        event = AuditEvent(
            event_id=event_id,
            timestamp=now,
            trace_id=trace_id,
            task_id=task_id,
            principal_id=principal_id,
            tenant_id=tenant_id,
            event_type=event_type,
            action=action,
            resource_id=resource_id,
            policy_decision=policy_decision,
            reason_code=reason_code,
            details=details or {}
        )
        self.repo.set("audit_events", event_id, event.model_dump())
        return event

    def list_events(
        self,
        principal_id: Optional[str] = None,
        task_id: Optional[str] = None,
        trace_id: Optional[str] = None,
        tenant_id: str = "demo-enterprise"
    ) -> List[Dict[str, Any]]:
        filters = {"tenant_id": tenant_id}
        if task_id:
            filters["task_id"] = task_id
        if trace_id:
            filters["trace_id"] = trace_id
        if principal_id:
            filters["principal_id"] = principal_id
        events = self.repo.list("audit_events", filters)
        # Sort by timestamp descending
        events.sort(key=lambda x: x.get("timestamp", ""), reverse=True)
        return events
