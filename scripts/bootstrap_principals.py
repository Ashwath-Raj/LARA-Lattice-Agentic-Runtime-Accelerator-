#!/usr/bin/env python3
"""LARA Secure Principal Bootstrap CLI.

Provisions an initial administrator or operational principal into Google Cloud Firestore.
Enforces:
- Plaintext passwords are NEVER stored in Firestore.
- Minimum 16-character password complexity for initial enrollment.
- Idempotency (does not overwrite existing principals unless --force-reset is passed).
- Comprehensive audit event logging in the 'audit_events' collection.
- Zero dependency on synthetic users in production.
"""

import os
import sys
import argparse
import secrets
import string
from datetime import datetime, timezone
from pathlib import Path

# Add project root to sys.path
ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from backend.app.core.security import hash_password

def generate_secure_password(length: int = 24) -> str:
    """Generate a high-entropy cryptographically secure password."""
    alphabet = string.ascii_letters + string.digits + "!@#$%^&*"
    while True:
        pwd = "".join(secrets.choice(alphabet) for _ in range(length))
        if (any(c.islower() for c in pwd)
                and any(c.isupper() for c in pwd)
                and any(c.isdigit() for c in pwd)
                and any(c in "!@#$%^&*" for c in pwd)):
            return pwd

def main():
    parser = argparse.ArgumentParser(description="LARA Secure Principal Bootstrap Utility")
    parser.add_argument("--project", default=os.environ.get("GOOGLE_CLOUD_PROJECT"), help="Google Cloud project ID")
    parser.add_argument("--database", default=os.environ.get("FIRESTORE_DATABASE", "(default)"), help="Firestore database")
    parser.add_argument("--tenant", default="staging-enterprise", help="Tenant identifier")
    parser.add_argument("--principal-id", required=True, help="Unique principal identifier (e.g., usr_staging_admin_01)")
    parser.add_argument("--display-name", required=True, help="Display name for principal")
    parser.add_argument("--roles", default="admin,operator,supervisor", help="Comma-separated list of roles")
    parser.add_argument("--clearance", default="confidential", help="Clearance level: public, internal, confidential")
    parser.add_argument("--password", help="Initial plaintext password (min 16 chars). If omitted, generated automatically.")
    parser.add_argument("--force-reset", action="store_true", help="Overwrite existing principal password hash")
    parser.add_argument("--offline-dry-run", action="store_true", help="Validate and output hashed record without writing to Firestore")

    args = parser.parse_args()

    if not args.project and not args.offline_dry-run:
        print("ERROR: --project or GOOGLE_CLOUD_PROJECT environment variable must be specified.", file=sys.stderr)
        sys.exit(1)

    password = args.password
    was_generated = False
    if not password:
        password = generate_secure_password(24)
        was_generated = True
    elif len(password) < 16:
        print("ERROR: Password must be at least 16 characters long for security compliance.", file=sys.stderr)
        sys.exit(1)

    # Compute salted PBKDF2-HMAC-SHA256 hash
    pwd_hash = hash_password(password)
    roles_list = [r.strip() for r in args.roles.split(",") if r.strip()]

    principal_doc = {
        "principal_id": args.principal_id,
        "display_name": args.display_name,
        "roles": roles_list,
        "attributes": {
            "clearance": args.clearance,
            "employment_status": "active"
        },
        "tenant_id": args.tenant,
        "password_hash": pwd_hash,
        "updated_at": datetime.now(timezone.utc).isoformat()
    }

    audit_event = {
        "event_id": f"evt_bootstrap_{secrets.token_hex(6)}",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "actor": "system:bootstrap_cli",
        "action": "principal.bootstrap",
        "resource": f"principal:{args.principal_id}",
        "tenant_id": args.tenant,
        "roles": roles_list,
        "status": "SUCCESS"
    }

    if args.offline_dry_run:
        print(f"[DRY-RUN] Principal doc prepared for {args.principal_id}:")
        print(f"  Tenant: {args.tenant}")
        print(f"  Roles: {roles_list}")
        print(f"  Password Hash: {pwd_hash[:30]}...")
        if was_generated:
            print(f"  Generated One-Time Password: {password}")
        print("[DRY-RUN] Offline dry run complete. No Firestore writes performed.")
        return

    # Live Firestore write
    from google.cloud import firestore
    db = firestore.Client(project=args.project, database=args.database)
    doc_ref = db.collection("principals").document(args.principal_id.replace(":", "__"))

    existing = doc_ref.get()
    if existing.exists and not args.force_reset:
        print(f"Principal '{args.principal_id}' already exists in project '{args.project}'.", file=sys.stderr)
        print("Pass --force-reset to update password hash. Exiting idempotently with code 0.")
        sys.exit(0)

    doc_ref.set(principal_doc)
    db.collection("audit_events").document(audit_event["event_id"]).set(audit_event)

    print(f"Successfully bootstrapped principal '{args.principal_id}' into Firestore.")
    print(f"  Project: {args.project}")
    print(f"  Tenant: {args.tenant}")
    print(f"  Roles: {roles_list}")
    if was_generated:
        print(f"\nIMPORTANT - GENERATED INITIAL CREDENTIAL (Save securely, will not be shown again):")
        print(f"  Principal ID: {args.principal_id}")
        print(f"  Password:     {password}\n")

if __name__ == "__main__":
    main()
