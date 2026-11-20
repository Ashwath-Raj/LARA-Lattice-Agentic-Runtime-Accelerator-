from fastapi import APIRouter, Depends
from backend.app.schemas.api import RouteResolveResponse
from backend.app.services.highways import HighwayResolver
from backend.app.core.dependencies import get_current_principal
from backend.app.domain.models import Principal

router = APIRouter(prefix="/graph", tags=["graph"])
highways = HighwayResolver()

@router.get("/routes/resolve", response_model=RouteResolveResponse)
def resolve_route(task_id: str, principal: Principal = Depends(get_current_principal)):
    result = highways.resolve_routes(principal, task_id)
    return RouteResolveResponse(
        task_id=result["task_id"],
        principal_id=result["principal_id"],
        permitted_sources=result["permitted_sources"],
        permitted_tools=result["permitted_tools"],
        selected_path=result["selected_path"],
        alternative_paths=result["alternative_paths"],
        excluded_candidates=result["excluded_candidates"],
        score_components=result["score_components"],
        graph_version=result["graph_version"]
    )
