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
        from backend.app.core.config import settings
        from backend.app.core.security import verify_password

        p_data = self.repo.get("principals", principal_id)
        if not p_data:
            raise AuthenticationError(f"Invalid demo principal: {principal_id}")

        if settings.ENVIRONMENT.lower() in ["production", "prod"] and not settings.GOOGLE_CLOUD_PROJECT:
            raise AuthenticationError("Demo login is restricted in production environments.")

        # Verify password if password_hash exists on principal
        stored_hash = p_data.get("password_hash")
        supplied_password = password or settings.DEMO_PASSWORD
        if stored_hash and not verify_password(supplied_password, stored_hash):
            raise AuthenticationError("Invalid password for demo principal")

        session_id = f"sess_{uuid.uuid4().hex}"
        now_dt = datetime.now(timezone.utc)
        expires_dt = datetime.fromtimestamp(now_dt.timestamp() + settings.SESSION_MAX_AGE_SECONDS, tz=timezone.utc)

        session = Session(
            session_id=session_id,
            principal_id=p_data["principal_id"],
            tenant_id=p_data.get("tenant_id", "demo-enterprise"),
            created_at=now_dt.isoformat(),
            expires_at=expires_dt.isoformat()
        )
        self.repo.set("sessions", session_id, session.model_dump())
        return session

    def validate_session(self, session_id: Optional[str]) -> Principal:
        if not session_id:
            raise AuthenticationError("Session cookie missing")
        sess_data = self.repo.get("sessions", session_id)
        if not sess_data:
            raise AuthenticationError("Invalid or expired session")

        # Check explicit invalidation
        if sess_data.get("invalidated"):
            raise AuthenticationError("Session has been logged out")

        # Check server-side expiration
        expires_at_str = sess_data.get("expires_at")
        if expires_at_str:
            expires_at = datetime.fromisoformat(expires_at_str)
            if datetime.now(timezone.utc) > expires_at:
                raise AuthenticationError("Session has expired")

        principal = self.get_principal(sess_data["principal_id"])
        if not principal:
            raise AuthenticationError("Principal record no longer exists")
        setattr(principal, "_session_id", session_id)
        return principal

    def invalidate_session(self, session_id: str) -> None:
        self.repo.update("sessions", session_id, {"invalidated": True})
