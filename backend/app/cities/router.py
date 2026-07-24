from datetime import date

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.dependencies import get_current_user
from app.db import get_db
from app.models.day_city import DayCity
from app.models.user import User

router = APIRouter()


@router.get("/by-date")
async def cities_by_date(
    date_from: str = Query(...),
    date_to: str = Query(...),
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    """
    Return all cities visited in the given date range, grouped by date.
    Response: { "days": [ { "date": "YYYY-MM-DD", "cities": [...] }, ... ] }
    """
    try:
        d_from = date.fromisoformat(date_from)
        d_to = date.fromisoformat(date_to)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid date format, use YYYY-MM-DD")

    if d_from > d_to:
        raise HTTPException(status_code=400, detail="date_from must be <= date_to")

    result = await db.execute(
        select(DayCity)
        .where(DayCity.calendar_date >= d_from)
        .where(DayCity.calendar_date <= d_to)
        .order_by(DayCity.calendar_date, DayCity.city)
    )
    rows = result.scalars().all()

    days: dict[date, list] = {}
    for row in rows:
        days.setdefault(row.calendar_date, []).append({
            "city": row.city,
            "country": row.country,
            "country_code": row.country_code,
            "visit_count": row.visit_count,
        })

    return {
        "days": [
            {"date": d.isoformat(), "cities": cities}
            for d, cities in sorted(days.items())
        ]
    }


@router.get("/by-city")
async def dates_by_city(
    city: str = Query(...),
    country_code: str | None = Query(default=None),
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    """
    Return all dates when a given city was visited.
    Optionally filter by country_code.
    Response: { "city": "...", "dates": [ { "date": "...", "visit_count": N }, ... ] }
    """
    stmt = (
        select(DayCity)
        .where(DayCity.city == city)
        .order_by(DayCity.calendar_date)
    )
    if country_code:
        stmt = stmt.where(DayCity.country_code == country_code.upper())

    result = await db.execute(stmt)
    rows = result.scalars().all()

    return {
        "city": city,
        "country_code": country_code,
        "dates": [
            {
                "date": row.calendar_date.isoformat(),
                "country": row.country,
                "country_code": row.country_code,
                "visit_count": row.visit_count,
            }
            for row in rows
        ],
    }


@router.get("/list")
async def list_cities(
    country_code: str | None = Query(default=None),
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    """
    Return distinct cities (with visit totals) for populating the filter dropdown.
    Optionally filter by country_code.
    """
    stmt = (
        select(
            DayCity.city,
            DayCity.country,
            DayCity.country_code,
        )
        .distinct()
        .order_by(DayCity.country_code, DayCity.city)
    )
    if country_code:
        stmt = stmt.where(DayCity.country_code == country_code.upper())

    result = await db.execute(stmt)
    rows = result.fetchall()

    return {
        "cities": [
            {"city": r.city, "country": r.country, "country_code": r.country_code}
            for r in rows
        ]
    }


@router.get("/countries")
async def list_countries(
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    """Return distinct countries for the country filter dropdown."""
    result = await db.execute(
        select(DayCity.country_code, DayCity.country)
        .distinct()
        .order_by(DayCity.country_code)
    )
    rows = result.fetchall()
    return {
        "countries": [{"country_code": r.country_code, "country": r.country} for r in rows]
    }
