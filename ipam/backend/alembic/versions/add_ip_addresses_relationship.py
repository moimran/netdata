"""Add relationship between Prefix and IPAddress

Revision ID: add_ip_addresses_relationship
Revises: add_uniqueness_constraints
Create Date: 2025-02-28 23:48:00.000000

"""
from alembic import op
import sqlalchemy as sa
import sqlmodel


# revision identifiers, used by Alembic.
revision = 'add_ip_addresses_relationship'
down_revision = 'add_uniqueness_constraints'
branch_labels = None
depends_on = None


def upgrade():
    # No schema changes needed, just updating the model relationships
    pass


def downgrade():
    # No schema changes needed
    pass
