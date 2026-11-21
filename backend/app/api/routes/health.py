from fastapi import APIRouter, status, Response

router = APIRouter(prefix="/health", tags=["health"])

@router.get("/live", status_code=status.HTTP_200_OK)
def liveness():
    return {"status": "alive"}

@router.get("/ready", status_code=status.HTTP_200_OK)
def readiness(response: Response):
    from backend.app.repositories.base import get_repository
    from backend.app.core.config import settings

    components: dict = {}
    is_ready = True
    errors = []

    # 1. Database / Repository reachability & initial data state
    repo = None
    try:
        repo = get_repository()
        meta = repo.get("graph_meta", "current")
        if not meta:
            components["database"] = {"status": "degraded", "detail": "graph_meta/current record missing"}
        else:
            components["database"] = {"status": "ok", "version": meta.get("version", 1)}
    except Exception as e:
        is_ready = False
        components["database"] = {"status": "down", "error": str(e)}
        errors.append(f"Database check failed: {str(e)}")

    # 2. Principals availability (bootstrap state verification)
    try:
        if repo and components.get("database", {}).get("status") in ["ok", "degraded"]:
            principals = repo.list("principals")
            if not principals:
                is_ready = False
                components["principals"] = {
                    "status": "uninitialized",
                    "detail": "Zero principals provisioned; secure bootstrap required before serving"
                }
                errors.append("Zero principals provisioned in database")
            else:
                components["principals"] = {
                    "status": "ok",
                    "count": len(principals)
                }
    except Exception as e:
        is_ready = False
        components["principals"] = {"status": "error", "error": str(e)}
        errors.append(f"Principals check failed: {str(e)}")

    # 3. Vertex AI Configuration & Client Readiness (Reported separately from database)
    is_prod = settings.ENVIRONMENT.lower() in ["production", "prod"]
    use_live_vertex = getattr(settings, "LARA_USE_LIVE_VERTEX_AI", False) or is_prod
    if use_live_vertex and not settings.GOOGLE_CLOUD_PROJECT:
        is_ready = False
        components["vertex_ai"] = {
            "status": "misconfigured",
            "mode": "live",
            "error": "GOOGLE_CLOUD_PROJECT required for live Vertex AI"
        }
        errors.append("Vertex AI missing GOOGLE_CLOUD_PROJECT")
    else:
        components["vertex_ai"] = {
            "status": "configured",
            "mode": "live" if use_live_vertex else "mock",
            "model": settings.VERTEX_AI_MODEL,
            "location": settings.VERTEX_AI_LOCATION,
            "note": "Readiness probe validates configuration and SDK initialization; live inference quota is not consumed by health probes"
        }

    # 4. Sandbox Execution State
    components["sandbox"] = {
        "status": "disabled_by_kill_switch" if settings.GOBOXD_KILL_SWITCH else "enabled",
        "kill_switch": settings.GOBOXD_KILL_SWITCH,
        "base_url": settings.GOBOXD_BASE_URL
    }

    # 5. Production configuration check
    if is_prod:
        if not settings.SECRET_KEY or len(settings.SECRET_KEY) < 32:
            is_ready = False
            errors.append("SECRET_KEY must be >= 32 characters in production")
        if not settings.GOOGLE_CLOUD_PROJECT:
            is_ready = False
            errors.append("GOOGLE_CLOUD_PROJECT required in production")
        if not settings.GCS_BUCKET:
            is_ready = False
            errors.append("GCS_BUCKET required in production")

    if not is_ready:
        response.status_code = status.HTTP_503_SERVICE_UNAVAILABLE
        return {
            "status": "not_ready",
            "errors": errors,
            "components": components
        }

    return {
        "status": "ready",
        "components": components
    }
