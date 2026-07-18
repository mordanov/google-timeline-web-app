"""
Drive importer service — polls a Google Drive folder on a schedule and imports
new or changed Timeline export files using the shared backend parser.
"""
import asyncio
import logging
import os
import sys
import time

sys.path.insert(0, "/app/backend")

from sqlalchemy import select

from app.db import AsyncSessionLocal
from app.importer.drive_client import download_file, list_files
from app.importer.service import process_import
from app.models.import_record import ImportRecord

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
logger = logging.getLogger(__name__)

SERVICE_ACCOUNT_JSON = os.environ.get("GOOGLE_SERVICE_ACCOUNT_JSON", "")
FOLDER_ID = os.environ.get("GOOGLE_DRIVE_FOLDER_ID", "")
SYNC_INTERVAL = int(os.environ.get("SYNC_INTERVAL_SECONDS", "900"))


async def get_last_md5(file_id: str) -> str | None:
    """Return the md5Checksum from the most recent completed import of this Drive file."""
    async with AsyncSessionLocal() as db:
        result = await db.execute(
            select(ImportRecord.file_md5)
            .where(ImportRecord.file_identifier == file_id)
            .where(ImportRecord.outcome.in_(["imported", "no_changes"]))
            .order_by(ImportRecord.triggered_at.desc())
            .limit(1)
        )
        row = result.scalar_one_or_none()
        return row


async def record_no_changes(file_id: str, file_name: str, md5: str) -> None:
    from datetime import datetime, timezone
    async with AsyncSessionLocal() as db:
        record = ImportRecord(
            trigger_source="scheduled",
            file_identifier=file_id,
            file_md5=md5,
            outcome="no_changes",
            completed_at=datetime.now(timezone.utc),
        )
        db.add(record)
        await db.commit()


async def create_scheduled_record(file_id: str, file_name: str, md5: str) -> int:
    async with AsyncSessionLocal() as db:
        record = ImportRecord(
            trigger_source="scheduled",
            file_identifier=file_id,
            file_md5=md5,
            outcome=None,
        )
        db.add(record)
        await db.commit()
        await db.refresh(record)
        return record.id


async def run_cycle() -> None:
    if not SERVICE_ACCOUNT_JSON or not FOLDER_ID:
        logger.warning("GOOGLE_SERVICE_ACCOUNT_JSON or GOOGLE_DRIVE_FOLDER_ID not set; skipping cycle")
        return

    logger.info("Starting Drive sync cycle for folder %s", FOLDER_ID)
    try:
        files = list_files(SERVICE_ACCOUNT_JSON, FOLDER_ID)
        logger.info("Found %d file(s) in Drive folder", len(files))
    except Exception:
        logger.exception("Failed to list Drive folder; will retry next cycle")
        return

    for file_info in files:
        file_id = file_info["id"]
        file_name = file_info.get("name", file_id)
        drive_md5 = file_info.get("md5Checksum")

        try:
            last_md5 = await get_last_md5(file_id)

            if last_md5 and last_md5 == drive_md5:
                logger.info("No changes detected for %s; logging no_changes", file_name)
                await record_no_changes(file_id, file_name, drive_md5 or "")
                continue

            logger.info("New or changed file detected: %s; downloading…", file_name)
            file_bytes = download_file(SERVICE_ACCOUNT_JSON, file_id)
            record_id = await create_scheduled_record(file_id, file_name, drive_md5 or "")
            await process_import(file_bytes, record_id, file_id)
            logger.info("Finished importing %s (record %d)", file_name, record_id)

        except Exception:
            logger.exception("Error processing Drive file %s; skipping to next file", file_name)


async def wait_for_db(retries: int = 10, delay: int = 5) -> None:
    from sqlalchemy import text
    from app.db import AsyncSessionLocal
    for attempt in range(1, retries + 1):
        try:
            async with AsyncSessionLocal() as db:
                await db.execute(text("SELECT 1"))
            logger.info("Database is ready")
            return
        except Exception as exc:
            logger.warning("DB not ready (attempt %d/%d): %s", attempt, retries, exc)
            if attempt < retries:
                await asyncio.sleep(delay)
    logger.error("Database did not become ready after %d attempts; exiting", retries)
    sys.exit(1)


async def main_async() -> None:
    logger.info("Drive importer starting (interval=%ds)", SYNC_INTERVAL)
    await wait_for_db()
    while True:
        await run_cycle()
        logger.info("Cycle complete; sleeping %ds", SYNC_INTERVAL)
        await asyncio.sleep(SYNC_INTERVAL)


def main() -> None:
    asyncio.run(main_async())


if __name__ == "__main__":
    main()
