from datetime import date, datetime

from sqlalchemy import Date, DateTime, Double, Float, Index, JSON, String, func
from sqlalchemy.orm import Mapped, mapped_column

from app.db import Base


class LocationSegment(Base):
    __tablename__ = "location_segments"

    id: Mapped[int] = mapped_column(primary_key=True)
    calendar_date: Mapped[date] = mapped_column(Date, nullable=False, index=True)
    segment_type: Mapped[str] = mapped_column(String(20), nullable=False)  # activity / visit / timeline_path
    started_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    ended_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    transport_mode_raw: Mapped[str | None] = mapped_column(String(50), nullable=True)
    transport_mode_group: Mapped[str | None] = mapped_column(String(20), nullable=True)
    distance_meters: Mapped[float | None] = mapped_column(Float, nullable=True)
    place_lat: Mapped[float | None] = mapped_column(Double, nullable=True)
    place_lng: Mapped[float | None] = mapped_column(Double, nullable=True)
    place_semantic_type: Mapped[str | None] = mapped_column(String(50), nullable=True)
    place_city: Mapped[str | None] = mapped_column(String(100), nullable=True)
    place_country: Mapped[str | None] = mapped_column(String(100), nullable=True)
    place_country_code: Mapped[str | None] = mapped_column(String(2), nullable=True)
    path_points: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    source_hash: Mapped[str | None] = mapped_column(String(64), nullable=True, index=True)
    import_record_id: Mapped[int | None] = mapped_column(nullable=True)

    __table_args__ = (
        Index("ix_location_segments_date_type", "calendar_date", "segment_type"),
    )
