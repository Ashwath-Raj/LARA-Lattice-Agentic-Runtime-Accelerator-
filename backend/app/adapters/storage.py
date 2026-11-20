import os
from abc import ABC, abstractmethod
from typing import Dict, Any, Tuple, Optional
from pathlib import Path
from backend.app.core.config import settings
from backend.app.core.errors import NotFoundError, StorageError

ROOT = Path(__file__).resolve().parents[3]

class BaseStorageAdapter(ABC):
    @abstractmethod
    def upload_file(self, file_id: str, content: bytes, content_type: str, filename: str) -> str:
        """Uploads file content and returns its canonical storage URI."""
        pass

    @abstractmethod
    def download_file(self, file_id: str) -> Tuple[bytes, str]:
        """Downloads file content and returns (bytes, content_type)."""
        pass

class LocalStorageAdapter(BaseStorageAdapter):
    """In-memory and local disk storage adapter for development and testing."""
    def __init__(self, upload_dir: Optional[Path] = None):
        self.upload_dir = upload_dir or (ROOT / "data" / "uploads")
        self.upload_dir.mkdir(parents=True, exist_ok=True)
        self._memory_store: Dict[str, Tuple[bytes, str]] = {}

    def upload_file(self, file_id: str, content: bytes, content_type: str, filename: str) -> str:
        self._memory_store[file_id] = (content, content_type)
        safe_path = self.upload_dir / file_id
        try:
            safe_path.write_bytes(content)
        except Exception:
            pass  # In-memory backup suffices if disk is read-only
        return f"local://{file_id}"

    def download_file(self, file_id: str) -> Tuple[bytes, str]:
        if file_id in self._memory_store:
            return self._memory_store[file_id]
        safe_path = self.upload_dir / file_id
        if safe_path.exists():
            return safe_path.read_bytes(), "application/octet-stream"
        raise NotFoundError(f"File '{file_id}' not found in storage")

class CloudStorageAdapter(BaseStorageAdapter):
    """Google Cloud Storage private bucket adapter using ADC / service identity."""
    def __init__(self, bucket_name: str, project: str):
        from google.cloud import storage
        self.client = storage.Client(project=project)
        self.bucket = self.client.bucket(bucket_name)

    def upload_file(self, file_id: str, content: bytes, content_type: str, filename: str) -> str:
        try:
            blob = self.bucket.blob(f"attachments/{file_id}/{filename}")
            blob.upload_from_string(content, content_type=content_type)
            return f"gs://{self.bucket.name}/{blob.name}"
        except Exception as e:
            raise StorageError(f"Cloud Storage upload failed: {str(e)}")

    def download_file(self, file_id: str) -> Tuple[bytes, str]:
        try:
            blobs = list(self.bucket.list_blobs(prefix=f"attachments/{file_id}/"))
            if not blobs:
                raise NotFoundError(f"File '{file_id}' not found in Cloud Storage")
            blob = blobs[0]
            content = blob.download_as_bytes()
            content_type = blob.content_type or "application/octet-stream"
            return content, content_type
        except NotFoundError:
            raise
        except Exception as e:
            raise StorageError(f"Cloud Storage download failed: {str(e)}")

_storage_instance: Optional[BaseStorageAdapter] = None

def get_storage_adapter() -> BaseStorageAdapter:
    global _storage_instance
    if _storage_instance is None:
        is_prod = settings.ENVIRONMENT.lower() in ["production", "prod"]
        if is_prod:
            if not settings.GCS_BUCKET or not settings.GOOGLE_CLOUD_PROJECT:
                raise RuntimeError("Production configuration error: GCS_BUCKET and GOOGLE_CLOUD_PROJECT must be configured")
            _storage_instance = CloudStorageAdapter(settings.GCS_BUCKET, settings.GOOGLE_CLOUD_PROJECT)
        else:
            _storage_instance = LocalStorageAdapter()
    return _storage_instance
