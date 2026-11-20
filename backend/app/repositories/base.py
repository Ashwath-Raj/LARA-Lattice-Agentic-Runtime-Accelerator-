import json
import os
from abc import ABC, abstractmethod
from typing import Dict, Any, List, Optional
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]

class BaseRepository(ABC):
    @abstractmethod
    def get(self, collection: str, doc_id: str) -> Optional[Dict[str, Any]]:
        pass

    @abstractmethod
    def set(self, collection: str, doc_id: str, data: Dict[str, Any]) -> None:
        pass

    @abstractmethod
    def list(self, collection: str, filters: Optional[Dict[str, Any]] = None) -> List[Dict[str, Any]]:
        pass

    @abstractmethod
    def update(self, collection: str, doc_id: str, updates: Dict[str, Any]) -> None:
        pass

class InMemoryRepository(BaseRepository):
    """In-memory repository backed by initialized synthetic fixtures."""
    def __init__(self):
        self._storage: Dict[str, Dict[str, Dict[str, Any]]] = {}
        self.load_synthetic_fixtures()

    def load_synthetic_fixtures(self):
        # Load synthetic users
        users_file = ROOT / "data" / "synthetic" / "users.json"
        if users_file.exists():
            data = json.loads(users_file.read_text(encoding="utf-8"))
            for p in data.get("principals", []):
                self.set("principals", p["principal_id"], p)

        # Load graph nodes
        nodes_file = ROOT / "data" / "synthetic" / "graph_nodes.json"
        if nodes_file.exists():
            nodes = json.loads(nodes_file.read_text(encoding="utf-8"))
            for node in nodes:
                self.set("graph_nodes", node["node_id"], node)

        # Load graph edges
        edges_file = ROOT / "data" / "synthetic" / "graph_edges.json"
        if edges_file.exists():
            edges = json.loads(edges_file.read_text(encoding="utf-8"))
            for edge in edges:
                self.set("graph_edges", edge["edge_id"], edge)

        # Load graph meta
        self.set("graph_meta", "current", {"version": 1, "tenant_id": "demo-enterprise", "seed_version": "1.0.0"})

        # Load synthetic sources into mock storage
        for name in ["incidents", "assets", "maintenance_history", "vendor_contracts"]:
            f = ROOT / "data" / "synthetic" / f"{name}.json"
            if f.exists():
                self.set("sources", name, json.loads(f.read_text(encoding="utf-8")))

    def get(self, collection: str, doc_id: str) -> Optional[Dict[str, Any]]:
        doc = self._storage.get(collection, {}).get(doc_id)
        return dict(doc) if doc else None

    def set(self, collection: str, doc_id: str, data: Dict[str, Any]) -> None:
        if collection not in self._storage:
            self._storage[collection] = {}
        self._storage[collection][doc_id] = dict(data)

    def list(self, collection: str, filters: Optional[Dict[str, Any]] = None) -> List[Dict[str, Any]]:
        coll = self._storage.get(collection, {})
        results = [dict(v) for v in coll.values()]
        if filters:
            for k, val in filters.items():
                results = [r for r in results if r.get(k) == val]
        return results

    def update(self, collection: str, doc_id: str, updates: Dict[str, Any]) -> None:
        if collection in self._storage and doc_id in self._storage[collection]:
            self._storage[collection][doc_id].update(updates)
        else:
            self.set(collection, doc_id, updates)

class FirestoreRepository(BaseRepository):
    """Google Cloud Firestore Native Mode Repository."""
    def __init__(self, project: str, database: str = "(default)"):
        from google.cloud import firestore
        self.db = firestore.Client(project=project, database=database)

    def _doc_ref(self, collection: str, doc_id: str):
        safe_id = doc_id.replace(":", "__")
        return self.db.collection(collection).document(safe_id)

    def get(self, collection: str, doc_id: str) -> Optional[Dict[str, Any]]:
        ref = self._doc_ref(collection, doc_id)
        doc = ref.get()
        return doc.to_dict() if doc.exists else None

    def set(self, collection: str, doc_id: str, data: Dict[str, Any]) -> None:
        ref = self._doc_ref(collection, doc_id)
        ref.set(data)

    def list(self, collection: str, filters: Optional[Dict[str, Any]] = None) -> List[Dict[str, Any]]:
        query = self.db.collection(collection)
        if filters:
            for k, val in filters.items():
                query = query.where(k, "==", val)
        return [doc.to_dict() for doc in query.stream()]

    def update(self, collection: str, doc_id: str, updates: Dict[str, Any]) -> None:
        ref = self._doc_ref(collection, doc_id)
        ref.update(updates)

# Global repository instance
_repo_instance: Optional[BaseRepository] = None

def get_repository() -> BaseRepository:
    global _repo_instance
    if _repo_instance is None:
        # Use Firestore if explicitly enabled in production, else fallback to InMemory seeded repository
        # This guarantees robust local execution and offline testability
        if os.environ.get("LARA_USE_LIVE_FIRESTORE") == "true":
            from backend.app.core.config import settings
            _repo_instance = FirestoreRepository(project=settings.GOOGLE_CLOUD_PROJECT, database=settings.FIRESTORE_DATABASE)
        else:
            _repo_instance = InMemoryRepository()
    return _repo_instance
