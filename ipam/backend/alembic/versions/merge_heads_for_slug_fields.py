"""merge heads for slug fields

Revision ID: merge_heads_for_slug_fields
Revises: 84a32030ccf0, make_slug_fields_optional
Create Date: 2025-03-01 17:46:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'merge_heads_for_slug_fields'
down_revision = None
branch_labels = None
depends_on = None

# This is a merge migration, so we need to specify the parents
parents = ['84a32030ccf0', 'make_slug_fields_optional']

def upgrade() -> None:
    # This is a merge migration, so we don't need to do anything here
    pass


def downgrade() -> None:
    # This is a merge migration, so we don't need to do anything here
    pass
