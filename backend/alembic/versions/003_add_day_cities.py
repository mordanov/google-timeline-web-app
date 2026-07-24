"""add day_cities table

Revision ID: 003
Revises: 002
Create Date: 2026-07-24

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "003"
down_revision: Union[str, None] = "002"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "day_cities",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("calendar_date", sa.Date(), nullable=False),
        sa.Column("city", sa.String(100), nullable=False),
        sa.Column("country", sa.String(100), nullable=False),
        sa.Column("country_code", sa.String(2), nullable=False),
        sa.Column("visit_count", sa.Integer(), nullable=False, server_default="1"),
        sa.UniqueConstraint("calendar_date", "city", "country_code", name="uq_day_city"),
    )
    op.create_index("ix_day_cities_calendar_date", "day_cities", ["calendar_date"])
    op.create_index("ix_day_cities_country_code", "day_cities", ["country_code"])


def downgrade() -> None:
    op.drop_index("ix_day_cities_country_code", table_name="day_cities")
    op.drop_index("ix_day_cities_calendar_date", table_name="day_cities")
    op.drop_table("day_cities")
