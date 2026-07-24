from datetime import date

from sqlalchemy import Date, Integer, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.db import Base


class DayCity(Base):
    __tablename__ = "day_cities"

    id: Mapped[int] = mapped_column(primary_key=True)
    calendar_date: Mapped[date] = mapped_column(Date, nullable=False, index=True)
    city: Mapped[str] = mapped_column(String(100), nullable=False)
    country: Mapped[str] = mapped_column(String(100), nullable=False)
    country_code: Mapped[str] = mapped_column(String(2), nullable=False, index=True)
    visit_count: Mapped[int] = mapped_column(Integer, nullable=False, default=1)

    __table_args__ = (
        UniqueConstraint("calendar_date", "city", "country_code", name="uq_day_city"),
    )
