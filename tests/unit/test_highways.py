import pytest
from backend.app.domain.models import Principal
from backend.app.services.highways import HighwayResolver
from backend.app.repositories.base import InMemoryRepository

@pytest.fixture
def highway_resolver():
    repo = InMemoryRepository()
    return HighwayResolver(repo)

def test_highway_resolution_operator(highway_resolver):
    operator = Principal(principal_id="usr_operator_01", display_name="Operator", roles=["operator"], attributes={"clearance": "internal"})
    res = highway_resolver.resolve_routes(operator, "task_100")

    assert "source:incident-log" in res["permitted_sources"]
    assert "source:asset-registry" in res["permitted_sources"]
    assert "source:sop-current" in res["permitted_sources"]
    # Vendor contract is confidential, must NOT be permitted for operator
    assert "source:vendor-contract" not in res["permitted_sources"]

    # Safe calculator is permitted
    assert "tool:calculator-safe" in res["permitted_tools"]
    # Equipment control must be excluded
    assert "tool:equipment-control" not in res["permitted_tools"]

def test_highway_resolution_supervisor(highway_resolver):
    supervisor = Principal(principal_id="usr_supervisor_01", display_name="Supervisor", roles=["supervisor"], attributes={"clearance": "confidential"})
    res = highway_resolver.resolve_routes(supervisor, "task_101")

    # Supervisor has confidential clearance, so vendor contract is permitted
    assert "source:vendor-contract" in res["permitted_sources"]
    assert "tool:maintenance-request" in res["permitted_tools"]
    assert "tool:equipment-control" not in res["permitted_tools"]
