"""Merge network devices, prefix relation, and optional ip name/slug branches

Revision ID: cc638852e9db
Revises: 8f3a2b4c5d6e, c1a9b8d7e6f5, 9a8c7b6d5e4f
Create Date: 2025-04-22 23:46:59.351920

"""
from alembic import op
import sqlalchemy as sa
import sqlmodel


# revision identifiers, used by Alembic.
revision = 'cc638852e9db'
down_revision = ('8f3a2b4c5d6e', 'c1a9b8d7e6f5', '9a8c7b6d5e4f')
branch_labels = None
depends_on = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
