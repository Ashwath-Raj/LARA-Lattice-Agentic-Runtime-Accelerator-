from fastapi import APIRouter, Response, Depends, status
from backend.app.schemas.api import DemoLoginRequest, PrincipalResponse, DemoLoginResponse
from backend.app.services.identity import IdentityService
from backend.app.core.config import settings
from backend.app.core.dependencies import get_current_principal
from backend.app.domain.models import Principal

router = APIRouter(prefix="/auth", tags=["auth"])
identity_svc = IdentityService()

@router.post("/demo-login", response_model=DemoLoginResponse)
def demo_login(req: DemoLoginRequest, response: Response):
    session = identity_svc.authenticate_demo_principal(req.principal_id, req.password)
    response.set_cookie(
        key=settings.SESSION_COOKIE_NAME,
        value=session.session_id,
        max_age=settings.SESSION_MAX_AGE_SECONDS,
        httponly=True,
        secure=settings.COOKIE_SECURE,
        samesite=settings.COOKIE_SAMESITE
    )
    principal = identity_svc.get_principal(req.principal_id)
    princ_resp = PrincipalResponse(
        principal_id=principal.principal_id,
        display_name=principal.display_name,
        roles=principal.roles,
        attributes=principal.attributes
    )
    return DemoLoginResponse(
        principal=princ_resp,
        session_expires_at=session.expires_at,
        principal_id=principal.principal_id,
        display_name=principal.display_name,
        roles=principal.roles,
        attributes=principal.attributes
    )

@router.get("/me", response_model=PrincipalResponse)
def get_me(principal: Principal = Depends(get_current_principal)):
    return PrincipalResponse(
        principal_id=principal.principal_id,
        display_name=principal.display_name,
        roles=principal.roles,
        attributes=principal.attributes
    )

@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
def logout(response: Response, principal: Principal = Depends(get_current_principal)):
    # Cookie is invalidated server-side and deleted from client
    if hasattr(principal, "_session_id") and principal._session_id:
        identity_svc.invalidate_session(principal._session_id)
    response.delete_cookie(key=settings.SESSION_COOKIE_NAME)
    return None
