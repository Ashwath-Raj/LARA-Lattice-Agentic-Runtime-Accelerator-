import pytest
from backend.app.services.identity import IdentityService
from backend.app.repositories.base import InMemoryRepository
from backend.app.core.security import hash_password
from backend.app.core.errors import AuthenticationError

@pytest.fixture
def identity_repo():
    repo = InMemoryRepository()
    # Add a well-formed principal with salted hash
    repo.set("principals", "usr_valid_01", {
        "principal_id": "usr_valid_01",
        "display_name": "Valid Operator",
        "roles": ["operator"],
        "attributes": {"clearance": "internal"},
        "tenant_id": "staging-tenant-a",
        "password_hash": hash_password("ValidPassword123!")
    })
    # Add a principal with missing password hash (uninitialized / unbootstrapped)
    repo.set("principals", "usr_nohash_01", {
        "principal_id": "usr_nohash_01",
        "display_name": "No Hash User",
        "roles": ["operator"],
        "attributes": {"clearance": "internal"},
        "tenant_id": "staging-tenant-a"
        # No password_hash
    })
    # Add a second tenant principal
    repo.set("principals", "usr_tenant_b_01", {
        "principal_id": "usr_tenant_b_01",
        "display_name": "Tenant B User",
        "roles": ["operator"],
        "attributes": {"clearance": "internal"},
        "tenant_id": "staging-tenant-b",
        "password_hash": hash_password("TenantBPassword123!")
    })
    return repo

def test_auth_missing_principal_rejected(identity_repo):
    """Verify non-existent principal ID raises AuthenticationError."""
    svc = IdentityService(repo=identity_repo)
    with pytest.raises(AuthenticationError, match="Invalid demo principal: usr_unknown_999"):
        svc.authenticate_demo_principal("usr_unknown_999", "SomePassword123!")

def test_auth_missing_password_hash_rejected(identity_repo):
    """Verify principal without configured password hash is rejected with AuthenticationError."""
    svc = IdentityService(repo=identity_repo)
    with pytest.raises(AuthenticationError, match="has no configured password hash"):
        svc.authenticate_demo_principal("usr_nohash_01", "SomePassword123!")

def test_auth_incorrect_password_rejected(identity_repo):
    """Verify incorrect password raises AuthenticationError."""
    svc = IdentityService(repo=identity_repo)
    with pytest.raises(AuthenticationError, match="Invalid password for principal"):
        svc.authenticate_demo_principal("usr_valid_01", "WrongPassword999!")

def test_auth_correct_password_succeeds(identity_repo):
    """Verify correct password produces an active authenticated session."""
    svc = IdentityService(repo=identity_repo)
    session = svc.authenticate_demo_principal("usr_valid_01", "ValidPassword123!")
    assert session.principal_id == "usr_valid_01"
    assert session.tenant_id == "staging-tenant-a"
    assert session.session_id.startswith("sess_")

    # Validate session resolves identical principal
    principal = svc.validate_session(session.session_id)
    assert principal.principal_id == "usr_valid_01"
    assert principal.tenant_id == "staging-tenant-a"

def test_auth_tenant_isolation(identity_repo):
    """Verify principals from different tenants maintain strict tenant isolation."""
    svc = IdentityService(repo=identity_repo)
    session_a = svc.authenticate_demo_principal("usr_valid_01", "ValidPassword123!")
    session_b = svc.authenticate_demo_principal("usr_tenant_b_01", "TenantBPassword123!")

    assert session_a.tenant_id == "staging-tenant-a"
    assert session_b.tenant_id == "staging-tenant-b"
    assert session_a.tenant_id != session_b.tenant_id

    princ_a = svc.validate_session(session_a.session_id)
    princ_b = svc.validate_session(session_b.session_id)
    assert princ_a.tenant_id == "staging-tenant-a"
    assert princ_b.tenant_id == "staging-tenant-b"

def test_bootstrap_principal_idempotency_and_audit(identity_repo):
    """Verify bootstrap_principal creates principal, writes audit log, and is idempotent."""
    svc = IdentityService(repo=identity_repo)
    pwd_hash = hash_password("NewAdminSecretPassword2026!")

    # 1. First bootstrap creates
    res1 = svc.bootstrap_principal(
        principal_id="usr_new_admin_01",
        display_name="New Admin",
        roles=["admin", "operator"],
        attributes={"clearance": "confidential"},
        password_hash=pwd_hash,
        tenant_id="staging-tenant-a",
        actor="system:unit_test"
    )
    assert res1["status"] == "created"
    assert res1["principal_id"] == "usr_new_admin_01"

    # Verify audit event was logged
    audit_events = identity_repo.list("audit_events", filters={"action": "principal.bootstrap"})
    assert len(audit_events) >= 1
    recent_evt = [e for e in audit_events if e["resource"] == "principal:usr_new_admin_01"][0]
    assert recent_evt["actor"] == "system:unit_test"
    assert recent_evt["status"] == "SUCCESS"

    # 2. Second bootstrap without force_reset is idempotent (does not overwrite)
    res2 = svc.bootstrap_principal(
        principal_id="usr_new_admin_01",
        display_name="New Admin",
        roles=["admin"],
        attributes={"clearance": "confidential"},
        password_hash=pwd_hash,
        tenant_id="staging-tenant-a",
        force_reset=False
    )
    assert res2["status"] == "exists"
    assert res2["action"] == "retained"

    # 3. Can authenticate with bootstrapped principal
    session = svc.authenticate_demo_principal("usr_new_admin_01", "NewAdminSecretPassword2026!")
    assert session.principal_id == "usr_new_admin_01"
