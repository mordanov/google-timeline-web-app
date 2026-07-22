"""
Backfill place_city / place_country / place_country_code for existing visit segments.

Run from the backend directory:
    python scripts/backfill_geocode.py

Reads DATABASE_URL from environment (same as the app).
"""
import asyncio
import os
import sys

import reverse_geocoder
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from app.models.location_segment import LocationSegment  # noqa: E402

DATABASE_URL = os.environ["DATABASE_URL"]

engine = create_async_engine(DATABASE_URL, echo=False)
SessionLocal = async_sessionmaker(engine, expire_on_commit=False)


async def backfill() -> None:
    async with SessionLocal() as db:
        result = await db.execute(
            select(LocationSegment.id, LocationSegment.place_lat, LocationSegment.place_lng)
            .where(LocationSegment.segment_type == "visit")
            .where(LocationSegment.place_lat.isnot(None))
            .where(LocationSegment.place_lng.isnot(None))
            .where(LocationSegment.place_country_code.is_(None))
        )
        rows = result.all()

    if not rows:
        print("Nothing to backfill.")
        return

    print(f"Geocoding {len(rows)} visit segments...")
    coords = [(r.place_lat, r.place_lng) for r in rows]
    geo_results = reverse_geocoder.search(coords, mode=1, verbose=False)

    async with SessionLocal() as db:
        for row, geo in zip(rows, geo_results):
            await db.execute(
                update(LocationSegment)
                .where(LocationSegment.id == row.id)
                .values(
                    place_city=geo.get("name") or None,
                    place_country=geo.get("admin1") or None,
                    place_country_code=geo.get("cc") or None,
                )
            )
        await db.commit()

    print(f"Done. Backfilled {len(rows)} rows.")


if __name__ == "__main__":
    asyncio.run(backfill())
