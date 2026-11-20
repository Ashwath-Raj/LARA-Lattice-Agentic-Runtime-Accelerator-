from fastapi import APIRouter, status, Response

router = APIRouter(prefix="/health", tags=["health"])

@router.get("/live", status_code=status.HTTP_200_OK)
def liveness():
    return {"status": "alive"}

@router.get("/ready", status_code=status.HTTP_200_OK)
def readiness(response: Response):
    # Verify database / repository reachability
    try:
        from backend.app.repositories.base import get_repository
        repo = get_repository()
        _ = repo.get("graph_meta", "current")
    except Exception as e:
        response.status_code = status.HTTP_503_SERVICE_UNAVAILABLE
        return {"status": "not_ready", "error": f"Database check failed: {str(e)}"}

    # In production, verify mandatory GCP configuration
    from backend.app.core.config import settings
    if settings.ENVIRONMENT.lower() in ["production", "prod"]:
        if not settings.GOOGLE_CLOUD_PROJECT or not settings.SECRET_KEY or len(settings.SECRET_KEY) < 32:
            response.status_code = status.HTTP_503_SERVICE_UNAVAILABLE
            return {"status": "not_ready", "error": "Missing mandatory production configuration"}

    return {"status": "ready"}
