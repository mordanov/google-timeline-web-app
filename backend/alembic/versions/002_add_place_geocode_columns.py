"""add place geocode columns

Revision ID: 002
Revises: 001
Create Date: 2026-07-22

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "002"
down_revision: Union[str, None] = "001"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("location_segments", sa.Column("place_city", sa.String(100), nullable=True))
    op.add_column("location_segments", sa.Column("place_country", sa.String(100), nullable=True))
    op.add_column("location_segments", sa.Column("place_country_code", sa.String(2), nullable=True))


def downgrade() -> None:
    op.drop_column("location_segments", "place_country_code")
    op.drop_column("location_segments", "place_country")
    op.drop_column("location_segments", "place_city")
