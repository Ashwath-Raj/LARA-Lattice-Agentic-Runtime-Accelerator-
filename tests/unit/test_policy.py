import pytest
from backend.app.domain.models import Principal, ClassificationLevel
from backend.app.services.policy import PolicyEngine
from backend.app.repositories.base import InMemoryRepository

@pytest.fixture
def policy_engine():
    repo = InMemoryRepository()
    return PolicyEngine(repo)

def test_fail_closed_on_missing_principal(policy_engine):
    dec = policy_engine.evaluate(None, "task.create", "task:root", "investigation")
    assert dec.decision.value == "DENY"
    assert dec.reason_code == "PRINCIPAL_MISSING_FAIL_CLOSED"

def test_equipment_control_strictly_denied(policy_engine):
    admin = Principal(principal_id="usr_admin_01", display_name="Admin", roles=["runtime_admin"], attributes={"clearance": "restricted"})
    dec = policy_engine.evaluate(admin, "equipment.control", "tool:equipment-control", "investigation")
    assert dec.decision.value == "DENY"
    assert "CONSTITUTIONAL_PROHIBITION" in dec.reason_code

def test_operator_cannot_access_confidential_vendor_contract(policy_engine):
    operator = Principal(principal_id="usr_operator_01", display_name="Operator", roles=["operator"], attributes={"clearance": "internal"})
    dec = policy_engine.evaluate(operator, "source.read", "source:vendor-contract", "incident_investigation")
    assert dec.decision.value == "DENY"

def test_supervisor_can_access_confidential_vendor_contract(policy_engine):
    supervisor = Principal(principal_id="usr_supervisor_01", display_name="Supervisor", roles=["supervisor"], attributes={"clearance": "confidential"})
    dec = policy_engine.evaluate(supervisor, "source.read", "source:vendor-contract", "incident_investigation")
    assert dec.decision.value == "ALLOW"

def test_maintenance_request_requires_approval(policy_engine):
    operator = Principal(principal_id="usr_operator_01", display_name="Operator", roles=["operator"], attributes={"clearance": "internal"})
    dec = policy_engine.evaluate(operator, "maintenance_request.execute", "tool:maintenance-request", "incident_investigation", context={"approved": False})
    assert dec.decision.value == "REQUIRE_APPROVAL"

def test_separation_of_duties_prevents_self_approval(policy_engine):
    supervisor = Principal(principal_id="usr_supervisor_01", display_name="Supervisor", roles=["supervisor"], attributes={"clearance": "confidential"})
    dec = policy_engine.evaluate(
        supervisor,
        "maintenance_request.execute",
        "tool:maintenance-request",
        "incident_investigation",
        context={"approved": True, "requested_by": "usr_supervisor_01"}
    )
    assert dec.decision.value == "DENY"
    assert "SEPARATION_OF_DUTIES" in dec.reason_code
