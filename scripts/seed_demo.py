"""Seed synthetic LARA demo data into Google Cloud Firestore and Cloud Storage.

Run only against the explicitly selected Google Cloud project. This script is intentionally
idempotent: document IDs are deterministic and writes replace only known demo records.
"""
import json, os
from pathlib import Path
from google.cloud import firestore, storage

ROOT = Path(__file__).resolve().parents[1]
PROJECT = os.environ["GOOGLE_CLOUD_PROJECT"]
BUCKET = os.environ["GCS_BUCKET"]
TENANT = "demo-enterprise"

def load(rel):
    return json.loads((ROOT / rel).read_text(encoding="utf-8"))

def main():
    db = firestore.Client(project=PROJECT)
    bucket = storage.Client(project=PROJECT).bucket(BUCKET)
    files = [
        ("incidents.json", "data/synthetic/incidents.json"),
        ("assets.json", "data/synthetic/assets.json"),
        ("maintenance_history.json", "data/synthetic/maintenance_history.json"),
        ("vendor_contracts.json", "data/synthetic/vendor_contracts.json"),
    ]
    for object_name, rel in files:
        blob = bucket.blob(f"demo/{TENANT}/sources/{object_name}")
        blob.upload_from_string((ROOT / rel).read_bytes(), content_type="application/json")
    for item in load("data/synthetic/graph_nodes.json"):
        db.collection("graph_nodes").document(item["node_id"].replace(":", "__")).set(item)
    for item in load("data/synthetic/graph_edges.json"):
        db.collection("graph_edges").document(item["edge_id"]).set(item)
    db.collection("graph_meta").document("current").set({"version": 1, "tenant_id": TENANT, "seed_version": "1.0.0"})
    db.collection("demo_seed").document("status").set({"seed_version": "1.0.0", "synthetic": True, "tenant_id": TENANT})
    print("Seed complete. Create demo principal password hashes through the backend admin seed command.")

if __name__ == "__main__":
    main()
