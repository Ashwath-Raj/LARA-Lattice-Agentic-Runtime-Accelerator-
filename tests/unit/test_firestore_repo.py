import pytest
from unittest.mock import MagicMock
from backend.app.repositories.base import FirestoreRepository, get_repository, BaseRepository

def test_firestore_doc_ref_replaces_colons():
    # Test that colon-separated IDs like 'source:incident-log' are sanitized for Firestore
    mock_db = MagicMock()
    mock_coll = MagicMock()
    mock_db.collection.return_value = mock_coll

    repo = object.__new__(FirestoreRepository)
    repo.db = mock_db

    ref = repo._doc_ref("graph_nodes", "source:incident-log")
    mock_db.collection.assert_called_with("graph_nodes")
    mock_coll.document.assert_called_with("source__incident-log")

def test_firestore_crud_operations():
    mock_db = MagicMock()
    mock_coll = MagicMock()
    mock_doc = MagicMock()
    mock_db.collection.return_value = mock_coll
    mock_coll.document.return_value = mock_doc

    repo = object.__new__(FirestoreRepository)
    repo.db = mock_db

    # 1. Set
    repo.set("tasks", "task:123", {"title": "Test Task"})
    mock_coll.document.assert_called_with("task__123")
    mock_doc.set.assert_called_with({"title": "Test Task"})

    # 2. Get existing
    mock_snapshot = MagicMock()
    mock_snapshot.exists = True
    mock_snapshot.to_dict.return_value = {"title": "Test Task"}
    mock_doc.get.return_value = mock_snapshot

    result = repo.get("tasks", "task:123")
    assert result == {"title": "Test Task"}

    # 3. Get non-existing
    mock_snapshot.exists = False
    assert repo.get("tasks", "task:nonexistent") is None

    # 4. Update
    repo.update("tasks", "task:123", {"status": "COMPLETED"})
    mock_doc.update.assert_called_with({"status": "COMPLETED"})

def test_production_fails_closed_without_firestore(monkeypatch):
    from backend.app.core.config import settings
    import backend.app.repositories.base as repo_module

    # Reset repository singleton
    monkeypatch.setattr(repo_module, "_repo_instance", None)
    monkeypatch.setattr(settings, "ENVIRONMENT", "production")
    monkeypatch.setattr(settings, "GOOGLE_CLOUD_PROJECT", "")

    # When in production and live firestore is not enabled, should raise RuntimeError
    with pytest.raises(RuntimeError) as exc_info:
        repo_module.get_repository()
    assert "Firestore Native mode must be enabled in production" in str(exc_info.value) or "GOOGLE_CLOUD_PROJECT" in str(exc_info.value)
