from typing import List, Dict, Any, Optional
from fastapi import APIRouter, Depends, Query
from backend.app.schemas.api import RouteResolveResponse, RoutePreviewRequest, GraphSummaryResponse
from backend.app.services.highways import HighwayResolver
from backend.app.core.dependencies import get_current_principal
from backend.app.domain.models import Principal

router = APIRouter(prefix="/graph", tags=["graph"])
highways = HighwayResolver()

@router.get("/summary", response_model=GraphSummaryResponse)
def get_graph_summary(principal: Principal = Depends(get_current_principal)):
    return highways.get_summary(principal)

@router.get("/nodes", response_model=List[Dict[str, Any]])
def get_graph_nodes(
    type: Optional[str] = Query(default=None, description="Filter by node type (e.g. source, tool, agent)"),
    principal: Principal = Depends(get_current_principal)
):
    return highways.get_nodes(principal, node_type=type)

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

@router.post("/routes/preview")
def preview_route(req: RoutePreviewRequest, principal: Principal = Depends(get_current_principal)):
    return highways.preview_route(
        principal=principal,
        intent=req.intent,
        required_capabilities=req.required_capabilities
    )

@router.get("/version")
def get_graph_version(principal: Principal = Depends(get_current_principal)):
    return highways.get_version(principal)
