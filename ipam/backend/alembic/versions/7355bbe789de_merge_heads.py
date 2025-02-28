"""Merge heads

Revision ID: 7355bbe789de
Revises: add_interface_device_models, add_parent_id_to_regions
Create Date: 2025-03-01 00:09:16.930940

"""
from alembic import op
import sqlalchemy as sa
import sqlmodel


# revision identifiers, used by Alembic.
revision = '7355bbe789de'
down_revision = ('add_interface_device_models', 'add_parent_id_to_regions')
branch_labels = None
depends_on = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
