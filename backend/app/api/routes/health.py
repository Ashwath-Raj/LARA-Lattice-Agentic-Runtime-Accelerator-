from fastapi import APIRouter, status, Response

router = APIRouter(prefix="/health", tags=["health"])

@router.get("/live", status_code=status.HTTP_200_OK)
def liveness():
    return {"status": "alive"}

@router.get("/ready", status_code=status.HTTP_200_OK)
def readiness(response: Response):
    # In a full check, verify database and storage reachability
    return {"status": "ready"}
