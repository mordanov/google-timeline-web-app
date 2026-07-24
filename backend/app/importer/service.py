import asyncio
import hashlib
import json
import logging
from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db import AsyncSessionLocal
from app.importer.parser import parse_timeline
from app.models.import_record import ImportRecord
from app.models.location_segment import LocationSegment
from app.cities.service import geocode_missing_days

logger = logging.getLogger(__name__)


def _md5(data: bytes) -> str:
    return hashlib.md5(data).hexdigest()


async def queue_upload(file_bytes: bytes, filename: str, db: AsyncSession) -> int:
    record = ImportRecord(
        trigger_source="manual",
        file_identifier=filename,
        file_md5=_md5(file_bytes),
        outcome=None,
    )
    db.add(record)
    await db.commit()
    await db.refresh(record)
    asyncio.create_task(process_import(file_bytes, record.id, filename))
    return record.id


async def process_import(file_bytes: bytes, import_record_id: int, file_identifier: str) -> None:
    async with AsyncSessionLocal() as db:
        record = await db.get(ImportRecord, import_record_id)
        if record is None:
            logger.error("ImportRecord %d not found", import_record_id)
            return

        file_md5 = _md5(file_bytes)

        try:
            # Idempotency: check if this exact file was already imported
            existing = await db.execute(
                select(ImportRecord)
                .where(ImportRecord.file_md5 == file_md5)
                .where(ImportRecord.outcome == "imported")
                .where(ImportRecord.id != import_record_id)
            )
            if existing.scalar_one_or_none() is not None:
                record.outcome = "no_changes"
                record.completed_at = datetime.now(timezone.utc)
                await db.commit()
                return

            data = json.loads(file_bytes)
            segments_data = parse_timeline(data)

            segments = [
                LocationSegment(
                    calendar_date=s["calendar_date"],
                    segment_type=s["segment_type"],
                    started_at=s["started_at"],
                    ended_at=s["ended_at"],
                    transport_mode_raw=s["transport_mode_raw"],
                    transport_mode_group=s["transport_mode_group"],
                    distance_meters=s["distance_meters"],
                    place_lat=s["place_lat"],
                    place_lng=s["place_lng"],
                    place_semantic_type=s["place_semantic_type"],
                    place_city=s["place_city"],
                    place_country=s["place_country"],
                    place_country_code=s["place_country_code"],
                    path_points=s["path_points"],
                    source_hash=file_md5,
                    import_record_id=import_record_id,
                )
                for s in segments_data
            ]
            db.add_all(segments)

            record.outcome = "imported"
            record.segments_imported = len(segments)
            record.file_md5 = file_md5
            record.completed_at = datetime.now(timezone.utc)
            await db.commit()

            try:
                n = await geocode_missing_days(db)
                if n:
                    logger.info("Geocoded day_cities for %d new dates", n)
            except Exception:
                logger.exception("geocode_missing_days failed after import %d", import_record_id)

        except Exception as exc:
            logger.exception("Import failed for record %d", import_record_id)
            try:
                record.outcome = "failed"
                record.error_message = str(exc)
                record.completed_at = datetime.now(timezone.utc)
                await db.commit()
            except Exception:
                logger.exception("Failed to update import record %d after error", import_record_id)
