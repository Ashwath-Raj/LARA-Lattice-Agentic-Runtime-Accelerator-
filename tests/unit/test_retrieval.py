import pytest
from backend.app.domain.models import Principal
from backend.app.services.retrieval import DeterministicKnowledgeRetrievalEngine
from backend.app.repositories.base import get_repository
from backend.app.core.errors import AuthenticationError

@pytest.fixture
def repo():
    return get_repository()

@pytest.fixture
def retrieval_engine(repo):
    return DeterministicKnowledgeRetrievalEngine(repo=repo)

@pytest.fixture
def operator_principal():
    return Principal(
        principal_id="usr_operator_01",
        display_name="Maya Operator",
        roles=["operator"],
        attributes={"department": "operations", "clearance": "internal"},
        tenant_id="demo-enterprise"
    )

@pytest.fixture
def supervisor_principal():
    return Principal(
        principal_id="usr_supervisor_01",
        display_name="Ravi Supervisor",
        roles=["supervisor"],
        attributes={"department": "operations", "clearance": "confidential"},
        tenant_id="demo-enterprise"
    )

def test_authorized_source_retrieval_operator(retrieval_engine, operator_principal):
    result = retrieval_engine.retrieve(
        query="Investigate P-204 cavitation and SOP-MNT-014 maintenance envelope",
        principal=operator_principal
    )
    assert result.principal_id == "usr_operator_01"
    assert result.tenant_id == "demo-enterprise"
    # Operator should have incident-log, asset-registry, maintenance-history, sop-current
    assert "source:incident-log" in result.permitted_sources
    assert "source:asset-registry" in result.permitted_sources
    assert "source:sop-current" in result.permitted_sources
    assert "source:vendor-contract" not in result.permitted_sources

    # Check evidence items
    assert len(result.evidence) > 0
    # Every evidence item must come from permitted sources
    for ev in result.evidence:
        assert ev.source_id in result.permitted_sources
        assert ev.confidence > 0
        assert ev.relevance_score > 0
        assert ev.source_revision != ""
        assert ev.retrieved_at != ""
        assert "tenant_id" in ev.provenance

def test_unauthorized_source_exclusion_operator(retrieval_engine, operator_principal):
    result = retrieval_engine.retrieve(
        query="Inspect vendor warranty terms and Asterion contract for P-204",
        principal=operator_principal
    )
    # Vendor contract must be in excluded_sources for operator
    excluded_sids = [e["source_id"] for e in result.excluded_sources]
    assert "source:vendor-contract" in excluded_sids
    # Evidence must not contain vendor contract content
    for ev in result.evidence:
        assert ev.source_id != "source:vendor-contract"

def test_authorized_source_retrieval_supervisor(retrieval_engine, supervisor_principal):
    result = retrieval_engine.retrieve(
        query="Inspect vendor warranty terms and Asterion contract for P-204",
        principal=supervisor_principal
    )
    # Supervisor has confidential clearance and can access vendor contract
    assert "source:vendor-contract" in result.permitted_sources
    vendor_evidence = [ev for ev in result.evidence if ev.source_id == "source:vendor-contract"]
    assert len(vendor_evidence) > 0
    assert vendor_evidence[0].classification == "CONFIDENTIAL"

def test_cross_tenant_isolation(retrieval_engine, operator_principal):
    # Register an alien tenant source
    retrieval_engine.register_source({
        "source_id": "source:alien-confidential-log",
        "title": "Alien Corp Incident Log",
        "tenant_id": "alien-corp",
        "classification": "INTERNAL",
        "status": "ACTIVE",
        "revision": "1.0",
        "trust_score": 0.99,
        "allowed_roles": ["operator", "supervisor"],
        "records": [{"incident_id": "INC-ALIEN-99", "summary": "Top secret alien data"}]
    })

    result = retrieval_engine.retrieve(
        query="INC-ALIEN-99 Top secret alien data",
        principal=operator_principal
    )
    # Must not appear in permitted_sources or evidence
    assert "source:alien-confidential-log" not in result.permitted_sources
    for ev in result.evidence:
        assert ev.source_id != "source:alien-confidential-log"
        assert "alien" not in ev.content.lower()

def test_missing_identity_fails_closed(retrieval_engine):
    with pytest.raises(AuthenticationError):
        retrieval_engine.retrieve(
            query="Investigate P-204",
            principal=None
        )

def test_source_unavailability_exclusion(retrieval_engine, supervisor_principal):
    # Mark asset registry as unavailable
    retrieval_engine.update_source_status("source:asset-registry", "UNAVAILABLE")
    try:
        result = retrieval_engine.retrieve(
            query="Asset threshold for P-204",
            principal=supervisor_principal
        )
        assert "source:asset-registry" not in result.permitted_sources
        excluded_map = {e["source_id"]: e["reason_code"] for e in result.excluded_sources}
        assert "source:asset-registry" in excluded_map
        assert excluded_map["source:asset-registry"] == "SOURCE_UNAVAILABLE"
    finally:
        retrieval_engine.update_source_status("source:asset-registry", "ACTIVE")

def test_obsolete_sop_exclusion(retrieval_engine, operator_principal):
    # Regular operational query must exclude obsolete SOP
    result = retrieval_engine.retrieve(
        query="SOP-MNT-014 pump maintenance steps",
        principal=operator_principal
    )
    excluded_map = {e["source_id"]: e["reason_code"] for e in result.excluded_sources}
    assert "source:sop-obsolete" in excluded_map
    assert excluded_map["source:sop-obsolete"] == "SOURCE_OBSOLETE"
    # Permitted sources should contain the current SOP
    assert "source:sop-current" in result.permitted_sources

def test_ranking_determinism(retrieval_engine, operator_principal):
    res1 = retrieval_engine.retrieve(query="Pump P-204 vibration threshold", principal=operator_principal)
    res2 = retrieval_engine.retrieve(query="Pump P-204 vibration threshold", principal=operator_principal)

    assert len(res1.evidence) == len(res2.evidence)
    for ev1, ev2 in zip(res1.evidence, res2.evidence):
        assert ev1.source_id == ev2.source_id
        assert ev1.relevance_score == ev2.relevance_score
        assert ev1.confidence == ev2.confidence
