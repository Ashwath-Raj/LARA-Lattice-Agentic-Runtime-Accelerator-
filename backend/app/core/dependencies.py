import uuid
from typing import Optional
from fastapi import Request, Depends
from backend.app.domain.models import Principal
from backend.app.core.config import settings
from backend.app.core.errors import AuthenticationError
from backend.app.services.identity import IdentityService

identity_service = IdentityService()

def get_current_principal(request: Request) -> Principal:
    """Dependency that extracts and validates the session cookie, resolving the server-side Principal."""
    session_id = request.cookies.get(settings.SESSION_COOKIE_NAME)
    # Also support Authorization: Bearer <session_id> for API testing
    if not session_id and "Authorization" in request.headers:
        auth_header = request.headers["Authorization"]
        if auth_header.startswith("Bearer "):
            session_id = auth_header[7:].strip()

    if not session_id:
        raise AuthenticationError("Authentication session cookie or Bearer token is required")

    principal = identity_service.validate_session(session_id)
    principal._session_id = session_id
    return principal


def get_optional_principal(request: Request) -> Optional[Principal]:
    try:
        return get_current_principal(request)
    except AuthenticationError:
        return None
