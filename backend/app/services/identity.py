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

        # Require a valid password hash for password-based authentication
        stored_hash = p_data.get("password_hash")
        if not stored_hash or not isinstance(stored_hash, str) or not stored_hash.strip():
            raise AuthenticationError(f"Principal '{principal_id}' has no configured password hash (uninitialized credential)")

        supplied_password = password
        if not supplied_password:
            if settings.ENVIRONMENT.lower() in ["production", "prod"]:
                raise AuthenticationError("Password is required for production authentication")
            supplied_password = settings.DEMO_PASSWORD

        if not verify_password(supplied_password, stored_hash):
            raise AuthenticationError("Invalid password for principal")

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

    def bootstrap_principal(
        self,
        principal_id: str,
        display_name: str,
        roles: List[str],
        attributes: Dict[str, Any],
        password_hash: str,
        tenant_id: str = "demo-enterprise",
        force_reset: bool = False,
        actor: str = "system:bootstrap"
    ) -> Dict[str, Any]:
        """Idempotently bootstrap an initial principal record into the repository.
        Plaintext passwords are never accepted or stored. Only verified password hashes are written.
        """
        if not password_hash or not password_hash.startswith("pbkdf2"):
            raise ValueError("A valid salted password hash (pbkdf2...) is strictly required for principal bootstrap")

        existing = self.repo.get("principals", principal_id)
        if existing and not force_reset:
            return {"status": "exists", "principal_id": principal_id, "action": "retained"}

        principal_doc = {
            "principal_id": principal_id,
            "display_name": display_name,
            "roles": roles,
            "attributes": attributes,
            "tenant_id": tenant_id,
            "password_hash": password_hash,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }
        self.repo.set("principals", principal_id, principal_doc)

        # Write audit event for principal bootstrap
        audit_event = {
            "event_id": f"evt_{uuid.uuid4().hex[:12]}",
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "actor": actor,
            "action": "principal.bootstrap",
            "resource": f"principal:{principal_id}",
            "tenant_id": tenant_id,
            "roles": roles,
            "status": "SUCCESS"
        }
        self.repo.set("audit_events", audit_event["event_id"], audit_event)

        return {"status": "created" if not existing else "reset", "principal_id": principal_id, "action": "written"}

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
