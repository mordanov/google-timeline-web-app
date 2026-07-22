from datetime import date

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.dependencies import get_current_user
from app.db import get_db
from app.locations.service import get_alltime_stats, get_days, get_segments, get_stats, get_status
from app.models.user import User

router = APIRouter()


def _resolve_date_params(
    date_param: str | None,
    date_from: str | None,
    date_to: str | None,
):
    """Parse and validate date query params. Returns (date_single, date_from, date_to)."""
    if date_param:
        try:
            return date.fromisoformat(date_param), None, None
        except ValueError:
            raise HTTPException(status_code=400, detail=f"Invalid date format: {date_param}")

    if date_from and date_to:
        try:
            return None, date.fromisoformat(date_from), date.fromisoformat(date_to)
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid date_from or date_to format")

    raise HTTPException(
        status_code=400,
        detail="Provide either 'date' or both 'date_from' and 'date_to'",
    )


@router.get("/alltime-stats")
async def alltime_stats(
    _user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await get_alltime_stats(db)


@router.get("/status")
async def get_location_status(
    _user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await get_status(db)


@router.get("/days")
async def list_days(
    _user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    days = await get_days(db)
    return {"dates": days}


@router.get("/segments")
async def list_segments(
    date: str | None = Query(default=None),
    date_from: str | None = Query(default=None),
    date_to: str | None = Query(default=None),
    _user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    d, df, dt = _resolve_date_params(date, date_from, date_to)
    segments = await get_segments(db, date_single=d, date_from=df, date_to=dt)
    return {
        "segments": [
            {
                "id": s.id,
                "calendar_date": s.calendar_date.isoformat(),
                "segment_type": s.segment_type,
                "started_at": s.started_at.isoformat() if s.started_at else None,
                "ended_at": s.ended_at.isoformat() if s.ended_at else None,
                "transport_mode_group": s.transport_mode_group,
                "distance_meters": s.distance_meters,
                "path_points": s.path_points,
                "place_lat": s.place_lat,
                "place_lng": s.place_lng,
                "place_semantic_type": s.place_semantic_type,
            }
            for s in segments
        ]
    }


@router.get("/stats")
async def list_stats(
    date: str | None = Query(default=None),
    date_from: str | None = Query(default=None),
    date_to: str | None = Query(default=None),
    _user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    d, df, dt = _resolve_date_params(date, date_from, date_to)
    stats = await get_stats(db, date_single=d, date_from=df, date_to=dt)
    return {"stats": stats}
