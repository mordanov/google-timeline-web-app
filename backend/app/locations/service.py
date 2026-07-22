from datetime import date, timedelta

from sqlalchemy import func, select, text
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


def _longest_streak(days: list[date]) -> int:
    if not days:
        return 0
    sorted_days = sorted(set(days))
    best = current = 1
    for i in range(1, len(sorted_days)):
        if (sorted_days[i] - sorted_days[i - 1]).days == 1:
            current += 1
            best = max(best, current)
        else:
            current = 1
    return best


async def get_alltime_stats(db: AsyncSession) -> dict:
    # --- Transport distances + durations (all time) ---
    transport_result = await db.execute(
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
    transport = [
        {
            "transport_mode_group": row.transport_mode_group,
            "total_distance_meters": row.total_distance_meters or 0.0,
            "total_duration_seconds": int(row.total_duration_seconds or 0),
        }
        for row in transport_result.all()
    ]

    # --- Countries: distinct, with first/last visit date ---
    countries_result = await db.execute(
        select(
            LocationSegment.place_country_code,
            LocationSegment.place_country,
            func.min(LocationSegment.calendar_date).label("first_visit"),
            func.max(LocationSegment.calendar_date).label("last_visit"),
        )
        .where(LocationSegment.segment_type == "visit")
        .where(LocationSegment.place_country_code.isnot(None))
        .group_by(LocationSegment.place_country_code, LocationSegment.place_country)
        .order_by(func.min(LocationSegment.calendar_date))
    )
    countries = [
        {
            "country_code": row.place_country_code,
            "country": row.place_country,
            "first_visit": row.first_visit.isoformat(),
            "last_visit": row.last_visit.isoformat(),
        }
        for row in countries_result.all()
    ]

    # --- Cities: distinct, with visit count and day count ---
    cities_result = await db.execute(
        select(
            LocationSegment.place_city,
            LocationSegment.place_country_code,
            LocationSegment.place_country,
            func.count(LocationSegment.id).label("visit_count"),
            func.count(LocationSegment.calendar_date.distinct()).label("day_count"),
            func.min(LocationSegment.calendar_date).label("first_visit"),
            func.max(LocationSegment.calendar_date).label("last_visit"),
        )
        .where(LocationSegment.segment_type == "visit")
        .where(LocationSegment.place_city.isnot(None))
        .group_by(
            LocationSegment.place_city,
            LocationSegment.place_country_code,
            LocationSegment.place_country,
        )
        .order_by(func.count(LocationSegment.id).desc())
    )
    cities = [
        {
            "city": row.place_city,
            "country_code": row.place_country_code,
            "country": row.place_country,
            "visit_count": row.visit_count,
            "day_count": row.day_count,
            "first_visit": row.first_visit.isoformat(),
            "last_visit": row.last_visit.isoformat(),
        }
        for row in cities_result.all()
    ]

    # --- All tracked dates (for total days, first/last, streak) ---
    days_result = await db.execute(
        select(LocationSegment.calendar_date)
        .distinct()
        .order_by(LocationSegment.calendar_date)
    )
    all_days: list[date] = [row[0] for row in days_result.all()]
    total_days = len(all_days)
    first_date = all_days[0].isoformat() if all_days else None
    last_date = all_days[-1].isoformat() if all_days else None
    longest_streak = _longest_streak(all_days)

    # --- Longest single day by distance ---
    longest_day_result = await db.execute(
        select(
            LocationSegment.calendar_date,
            func.sum(LocationSegment.distance_meters).label("day_distance"),
        )
        .where(LocationSegment.segment_type == "activity")
        .where(LocationSegment.distance_meters.isnot(None))
        .group_by(LocationSegment.calendar_date)
        .order_by(func.sum(LocationSegment.distance_meters).desc())
        .limit(1)
    )
    longest_day_row = longest_day_result.first()
    longest_day = {
        "date": longest_day_row.calendar_date.isoformat(),
        "distance_meters": longest_day_row.day_distance or 0.0,
    } if longest_day_row else None

    # --- Most active month by distance ---
    most_active_month_result = await db.execute(
        select(
            func.date_trunc("month", LocationSegment.calendar_date).label("month"),
            func.sum(LocationSegment.distance_meters).label("month_distance"),
        )
        .where(LocationSegment.segment_type == "activity")
        .where(LocationSegment.distance_meters.isnot(None))
        .group_by(text("1"))
        .order_by(func.sum(LocationSegment.distance_meters).desc())
        .limit(1)
    )
    most_active_month_row = most_active_month_result.first()
    most_active_month = {
        "month": most_active_month_row.month.strftime("%Y-%m"),
        "distance_meters": most_active_month_row.month_distance or 0.0,
    } if most_active_month_row else None

    # --- Total transit time (all activities) ---
    total_time_result = await db.execute(
        select(
            func.sum(
                func.extract("epoch", LocationSegment.ended_at - LocationSegment.started_at)
            ).label("total_seconds")
        )
        .where(LocationSegment.segment_type == "activity")
    )
    total_time_seconds = int(total_time_result.scalar_one_or_none() or 0)

    # --- Unique places (city+country combos) ---
    unique_places_result = await db.execute(
        select(func.count())
        .select_from(
            select(LocationSegment.place_city, LocationSegment.place_country_code)
            .where(LocationSegment.segment_type == "visit")
            .where(LocationSegment.place_city.isnot(None))
            .distinct()
            .subquery()
        )
    )
    unique_places = unique_places_result.scalar_one_or_none() or 0

    return {
        "transport": transport,
        "countries": countries,
        "cities": cities,
        "total_days": total_days,
        "first_date": first_date,
        "last_date": last_date,
        "longest_streak_days": longest_streak,
        "longest_day": longest_day,
        "most_active_month": most_active_month,
        "total_transit_seconds": total_time_seconds,
        "unique_places": unique_places,
    }
