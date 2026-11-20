from typing import List, Dict, Any
from fastapi import APIRouter, Depends
from backend.app.agents.registry import AgentRegistry
from backend.app.core.dependencies import get_current_principal
from backend.app.domain.models import Principal

router = APIRouter(prefix="/agents", tags=["agents"])
registry = AgentRegistry()

@router.get("", response_model=List[Dict[str, Any]])
def list_agents(principal: Principal = Depends(get_current_principal)):
    return registry.list_agents()

@router.get("/{agent_id}")
def get_agent(agent_id: str, principal: Principal = Depends(get_current_principal)):
    return registry.get_agent(agent_id)

@router.get("/{agent_id}/versions", response_model=List[Dict[str, Any]])
def get_agent_versions(agent_id: str, principal: Principal = Depends(get_current_principal)):
    return registry.get_agent_versions(agent_id)

@router.get("/{agent_id}/skills", response_model=List[Dict[str, Any]])
def get_agent_skills(agent_id: str, principal: Principal = Depends(get_current_principal)):
    return registry.get_agent_skills(agent_id)
