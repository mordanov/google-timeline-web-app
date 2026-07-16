"""initial schema

Revision ID: 001
Revises:
Create Date: 2026-07-16

"""
from typing import Sequence, Union

import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSONB
from alembic import op

revision: str = "001"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "users",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("username", sa.String(100), nullable=False),
        sa.Column("password_hash", sa.String(255), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("username"),
    )

    op.create_table(
        "import_records",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("triggered_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("trigger_source", sa.String(20), nullable=False),
        sa.Column("file_identifier", sa.String(500), nullable=False),
        sa.Column("file_md5", sa.String(32), nullable=True),
        sa.Column("outcome", sa.String(20), nullable=True),
        sa.Column("segments_imported", sa.Integer(), nullable=True),
        sa.Column("error_message", sa.Text(), nullable=True),
        sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_import_records_triggered_at", "import_records", ["triggered_at"], postgresql_ops={"triggered_at": "DESC"})

    op.create_table(
        "location_segments",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("calendar_date", sa.Date(), nullable=False),
        sa.Column("segment_type", sa.String(20), nullable=False),
        sa.Column("started_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("ended_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("transport_mode_raw", sa.String(50), nullable=True),
        sa.Column("transport_mode_group", sa.String(20), nullable=True),
        sa.Column("distance_meters", sa.Float(), nullable=True),
        sa.Column("place_lat", sa.Double(), nullable=True),
        sa.Column("place_lng", sa.Double(), nullable=True),
        sa.Column("place_semantic_type", sa.String(50), nullable=True),
        sa.Column("path_points", JSONB(), nullable=True),
        sa.Column("source_hash", sa.String(64), nullable=True),
        sa.Column("import_record_id", sa.Integer(), nullable=True),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_location_segments_calendar_date", "location_segments", ["calendar_date"])
    op.create_index("ix_location_segments_source_hash", "location_segments", ["source_hash"])
    op.create_index("ix_location_segments_date_type", "location_segments", ["calendar_date", "segment_type"])


def downgrade() -> None:
    op.drop_table("location_segments")
    op.drop_table("import_records")
    op.drop_table("users")
