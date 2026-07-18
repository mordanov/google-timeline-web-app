from datetime import date, timedelta

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.import_record import ImportRecord
from app.models.location_segment import LocationSegment


async def get_status(db: AsyncSession) -> dict:
    max_date_result = await db.execute(
        select(func.max(LocationSegment.calendar_date))
    )
    max_date = max_date_result.scalar_one_or_none()

    last_sync_result = await db.execute(
        select(ImportRecord.completed_at)
        .where(ImportRecord.completed_at.isnot(None))
        .order_by(ImportRecord.completed_at.desc())
        .limit(1)
    )
    last_sync = last_sync_result.scalar_one_or_none()

    return {
        "max_tracking_date": max_date.isoformat() if max_date else None,
        "last_sync_at": last_sync.isoformat() if last_sync else None,
    }


async def get_days(db: AsyncSession) -> list[str]:
    result = await db.execute(
        select(LocationSegment.calendar_date)
        .distinct()
        .order_by(LocationSegment.calendar_date)
    )
    return [row[0].isoformat() for row in result.all()]


async def get_segments(
    db: AsyncSession,
    date_single: date | None = None,
    date_from: date | None = None,
    date_to: date | None = None,
) -> list[LocationSegment]:
    stmt = select(LocationSegment)
    if date_single is not None:
        stmt = stmt.where(LocationSegment.calendar_date == date_single)
    else:
        stmt = stmt.where(
            LocationSegment.calendar_date >= date_from,
            LocationSegment.calendar_date <= date_to,
        )
    stmt = stmt.order_by(LocationSegment.started_at)
    result = await db.execute(stmt)
    return list(result.scalars().all())


async def get_stats(
    db: AsyncSession,
    date_single: date | None = None,
    date_from: date | None = None,
    date_to: date | None = None,
) -> list[dict]:
    stmt = (
        select(
            LocationSegment.transport_mode_group,
            func.sum(LocationSegment.distance_meters).label("total_distance_meters"),
            func.sum(
                func.extract("epoch", LocationSegment.ended_at - LocationSegment.started_at)
            ).label("total_duration_seconds"),
        )
        .where(LocationSegment.segment_type == "activity")
        .where(LocationSegment.transport_mode_group.isnot(None))
        .group_by(LocationSegment.transport_mode_group)
        .order_by(func.sum(LocationSegment.distance_meters).desc())
    )
    if date_single is not None:
        stmt = stmt.where(LocationSegment.calendar_date == date_single)
    else:
        stmt = stmt.where(
            LocationSegment.calendar_date >= date_from,
            LocationSegment.calendar_date <= date_to,
        )
    result = await db.execute(stmt)
    return [
        {
            "transport_mode_group": row.transport_mode_group,
            "total_distance_meters": row.total_distance_meters or 0.0,
            "total_duration_seconds": int(row.total_duration_seconds or 0),
        }
        for row in result.all()
    ]
