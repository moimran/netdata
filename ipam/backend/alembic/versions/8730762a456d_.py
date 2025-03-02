"""empty message

Revision ID: 8730762a456d
Revises: 84a32030ccf0, make_slug_fields_optional, merge_heads_for_slug_fields
Create Date: 2025-03-02 12:55:06.037194

"""
from alembic import op
import sqlalchemy as sa
import sqlmodel


# revision identifiers, used by Alembic.
revision = '8730762a456d'
down_revision = ('84a32030ccf0', 'make_slug_fields_optional', 'merge_heads_for_slug_fields')
branch_labels = None
depends_on = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
