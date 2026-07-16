from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.dependencies import get_current_user
from app.db import get_db
from app.importer.service import queue_upload
from app.models.import_record import ImportRecord
from app.models.user import User

router = APIRouter()


@router.post("/upload", status_code=status.HTTP_202_ACCEPTED)
async def upload_timeline(
    file: UploadFile,
    _user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if not file.filename:
        raise HTTPException(status_code=400, detail="No file provided")
    file_bytes = await file.read()
    import_record_id = await queue_upload(file_bytes, file.filename, db)
    return {"status": "queued", "import_record_id": import_record_id}


@router.get("/status/{import_record_id}")
async def get_import_status(
    import_record_id: int,
    _user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    record = await db.get(ImportRecord, import_record_id)
    if record is None:
        raise HTTPException(status_code=404, detail="Import record not found")
    return _record_dict(record)


@router.get("/history")
async def get_import_history(
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
    _user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    total_result = await db.execute(select(func.count()).select_from(ImportRecord))
    total = total_result.scalar_one()

    result = await db.execute(
        select(ImportRecord)
        .order_by(ImportRecord.triggered_at.desc())
        .limit(limit)
        .offset(offset)
    )
    records = list(result.scalars().all())
    return {"records": [_record_dict(r) for r in records], "total": total}


def _record_dict(r: ImportRecord) -> dict:
    return {
        "id": r.id,
        "triggered_at": r.triggered_at.isoformat() if r.triggered_at else None,
        "trigger_source": r.trigger_source,
        "file_identifier": r.file_identifier,
        "outcome": r.outcome,
        "segments_imported": r.segments_imported,
        "error_message": r.error_message,
        "completed_at": r.completed_at.isoformat() if r.completed_at else None,
    }
