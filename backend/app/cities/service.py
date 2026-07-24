"""
City-per-day geocoding service.

Reads visit segments from location_segments, reverse-geocodes their coordinates
using the offline reverse_geocoder library, and upserts one row per
(calendar_date, city, country_code) into day_cities.

Only processes dates older than now()-2 days (recent days may still be changing).
"""
import logging
from datetime import date, timedelta

import reverse_geocoder
from sqlalchemy import delete, func, select, text
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.day_city import DayCity
from app.models.location_segment import LocationSegment

logger = logging.getLogger(__name__)

_CUTOFF_LAG_DAYS = 2


def _cutoff_date() -> date:
    return date.today() - timedelta(days=_CUTOFF_LAG_DAYS)


async def geocode_missing_days(db: AsyncSession) -> int:
    """
    Find visit-segment dates that are not yet in day_cities and are old enough,
    geocode them, and upsert into day_cities.
    Returns the number of dates processed.
    """
    cutoff = _cutoff_date()

    # Dates that have visit segments but no day_cities rows yet
    existing_dates_sq = select(DayCity.calendar_date).distinct()
    stmt = (
        select(LocationSegment.calendar_date)
        .where(LocationSegment.segment_type == "visit")
        .where(LocationSegment.calendar_date <= cutoff)
        .where(LocationSegment.place_lat.is_not(None))
        .where(LocationSegment.place_lng.is_not(None))
        .where(LocationSegment.calendar_date.not_in(existing_dates_sq))
        .distinct()
    )
    result = await db.execute(stmt)
    missing_dates = [row[0] for row in result.fetchall()]

    if not missing_dates:
        return 0

    await _process_dates(db, missing_dates)
    return len(missing_dates)


async def geocode_dates(db: AsyncSession, dates: list[date]) -> int:
    """
    (Re)geocode specific dates — used by the backfill script.
    Deletes existing day_cities rows for these dates before reinserting.
    """
    if not dates:
        return 0
    await db.execute(delete(DayCity).where(DayCity.calendar_date.in_(dates)))
    await _process_dates(db, dates)
    return len(dates)


async def _process_dates(db: AsyncSession, dates: list[date]) -> None:
    """Geocode all visit segments for the given dates and upsert into day_cities."""
    stmt = (
        select(
            LocationSegment.calendar_date,
            LocationSegment.place_lat,
            LocationSegment.place_lng,
        )
        .where(LocationSegment.segment_type == "visit")
        .where(LocationSegment.calendar_date.in_(dates))
        .where(LocationSegment.place_lat.is_not(None))
        .where(LocationSegment.place_lng.is_not(None))
    )
    result = await db.execute(stmt)
    rows = result.fetchall()

    if not rows:
        return

    coords = [(r.place_lat, r.place_lng) for r in rows]
    geo_results = reverse_geocoder.search(coords, mode=1, verbose=False)

    # Aggregate: (date, city, country_code) -> (country, count)
    counts: dict[tuple, list] = {}
    for row, geo in zip(rows, geo_results):
        city = geo.get("name") or ""
        country = geo.get("admin1") or ""
        cc = geo.get("cc") or ""
        if not city or not cc:
            continue
        key = (row.calendar_date, city, cc)
        if key not in counts:
            counts[key] = [country, 0]
        counts[key][1] += 1

    if not counts:
        return

    # Upsert: on conflict update visit_count
    values = [
        {
            "calendar_date": k[0],
            "city": k[1],
            "country_code": k[2],
            "country": v[0],
            "visit_count": v[1],
        }
        for k, v in counts.items()
    ]
    stmt = pg_insert(DayCity).values(values)
    stmt = stmt.on_conflict_do_update(
        constraint="uq_day_city",
        set_={"visit_count": stmt.excluded.visit_count, "country": stmt.excluded.country},
    )
    await db.execute(stmt)
    await db.commit()
    logger.info("Upserted day_cities for %d dates (%d rows)", len(dates), len(values))
