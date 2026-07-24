"""
One-off backfill: populate day_cities for all historical visit segments.

Usage (from backend/ dir, with DATABASE_URL in env):
    python scripts/backfill_day_cities.py

Optional flags:
    --force    Re-geocode dates that already have day_cities rows (full rebuild)
"""
import argparse
import asyncio
import logging
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

os.environ.setdefault("JWT_SECRET", "backfill-script")

from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db import AsyncSessionLocal
from app.cities.service import geocode_dates, geocode_missing_days, _cutoff_date
from app.models.day_city import DayCity
from app.models.location_segment import LocationSegment

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
logger = logging.getLogger(__name__)


async def run(force: bool) -> None:
    async with AsyncSessionLocal() as db:
        if force:
            logger.info("--force: clearing all day_cities rows")
            await db.execute(delete(DayCity))
            await db.commit()

        if force:
            cutoff = _cutoff_date()
            result = await db.execute(
                select(LocationSegment.calendar_date)
                .where(LocationSegment.segment_type == "visit")
                .where(LocationSegment.calendar_date <= cutoff)
                .where(LocationSegment.place_lat.is_not(None))
                .where(LocationSegment.place_lng.is_not(None))
                .distinct()
            )
            dates = [r[0] for r in result.fetchall()]
            logger.info("Processing %d dates (force mode)", len(dates))
            n = await geocode_dates(db, dates)
        else:
            n = await geocode_missing_days(db)
            logger.info("Processed %d missing dates", n)

    logger.info("Done.")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--force", action="store_true", help="Rebuild all day_cities from scratch")
    args = parser.parse_args()
    asyncio.run(run(args.force))
