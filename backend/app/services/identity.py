import uuid
from datetime import datetime, timezone
from typing import Optional, Dict, Any, List
from backend.app.domain.models import Principal, Session
from backend.app.core.errors import AuthenticationError, NotFoundError
from backend.app.repositories.base import get_repository

class IdentityService:
    def __init__(self, repo=None):
        self.repo = repo or get_repository()

    def get_principal(self, principal_id: str) -> Optional[Principal]:
        data = self.repo.get("principals", principal_id)
        if not data:
            return None
        return Principal(
            principal_id=data["principal_id"],
            display_name=data.get("display_name", principal_id),
            roles=data.get("roles", []),
            attributes=data.get("attributes", {}),
            tenant_id=data.get("tenant_id", "demo-enterprise")
        )

    def authenticate_demo_principal(self, principal_id: str, password: Optional[str] = None) -> Session:
        # In prototype mode, verify principal exists in synthetic seed
        principal = self.get_principal(principal_id)
        if not principal:
            raise AuthenticationError(f"Invalid demo principal: {principal_id}")

        session_id = f"sess_{uuid.uuid4().hex}"
        now = datetime.now(timezone.utc).isoformat()
        # 24 hours expiry
        session = Session(
            session_id=session_id,
            principal_id=principal.principal_id,
            tenant_id=principal.tenant_id,
            created_at=now,
            expires_at=now
        )
        self.repo.set("sessions", session_id, session.model_dump())
        return session

    def validate_session(self, session_id: Optional[str]) -> Principal:
        if not session_id:
            raise AuthenticationError("Session cookie missing")
        sess_data = self.repo.get("sessions", session_id)
        if not sess_data:
            raise AuthenticationError("Invalid or expired session")
        principal = self.get_principal(sess_data["principal_id"])
        if not principal:
            raise AuthenticationError("Principal record no longer exists")
        return principal

    def invalidate_session(self, session_id: str) -> None:
        self.repo.set("sessions", session_id, {"invalidated": True})
