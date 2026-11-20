import uuid
import os
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, UploadFile, File, Response, status
from typing import Dict, Any
from backend.app.adapters.storage import get_storage_adapter
from backend.app.core.config import settings
from backend.app.core.dependencies import get_current_principal
from backend.app.domain.models import Principal
from backend.app.repositories.base import get_repository
from backend.app.core.errors import ValidationError, NotFoundError

router = APIRouter(prefix="/files", tags=["files"])
repo = get_repository()
storage = get_storage_adapter()

@router.post("/upload", status_code=status.HTTP_201_CREATED)
async def upload_file(
    file: UploadFile = File(...),
    principal: Principal = Depends(get_current_principal)
) -> Dict[str, Any]:
    # Validate MIME type
    content_type = file.content_type or "application/octet-stream"
    if content_type not in settings.ALLOWED_UPLOAD_MIME_TYPES:
        raise ValidationError(
            f"Content-type '{content_type}' is not permitted. Allowed: {settings.ALLOWED_UPLOAD_MIME_TYPES}"
        )

    # Sanitize filename
    clean_filename = os.path.basename(file.filename or "upload.bin").replace("..", "_")

    # Read content and enforce size bound
    content = await file.read()
    if len(content) > settings.MAX_UPLOAD_SIZE_BYTES:
        raise ValidationError(
            f"File size {len(content)} bytes exceeds maximum allowed of {settings.MAX_UPLOAD_SIZE_BYTES} bytes"
        )

    file_id = f"fil_{uuid.uuid4().hex[:12]}"
    now = datetime.now(timezone.utc).isoformat()

    storage_uri = storage.upload_file(file_id, content, content_type, clean_filename)

    meta = {
        "file_id": file_id,
        "filename": clean_filename,
        "content_type": content_type,
        "size_bytes": len(content),
        "storage_uri": storage_uri,
        "uploaded_by": principal.principal_id,
        "tenant_id": principal.tenant_id,
        "created_at": now
    }
    repo.set("files", file_id, meta)
    return meta

@router.get("/{file_id}/download")
def download_file(
    file_id: str,
    principal: Principal = Depends(get_current_principal)
):
    meta = repo.get("files", file_id)
    if not meta:
        raise NotFoundError(f"File '{file_id}' not found")

    # Tenant scoping
    if meta.get("tenant_id") != principal.tenant_id:
        raise NotFoundError(f"File '{file_id}' not found")

    content, content_type = storage.download_file(file_id)
    filename = meta.get("filename", f"{file_id}.bin")

    return Response(
        content=content,
        media_type=content_type,
        headers={"Content-Disposition": f'attachment; filename="{filename}"'}
    )
