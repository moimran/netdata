"""Add prefix_id to ip_addresses

Revision ID: a626cf22a621
Revises: 5b2c70227a85
Create Date: 2025-03-01 00:19:44.285799

"""
from alembic import op
import sqlalchemy as sa
import sqlmodel


# revision identifiers, used by Alembic.
revision = 'a626cf22a621'
down_revision = '5b2c70227a85'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add prefix_id column to ip_addresses table
    op.add_column('ip_addresses', sa.Column('prefix_id', sa.Integer(), nullable=True))
    op.create_foreign_key(None, 'ip_addresses', 'prefixes', ['prefix_id'], ['id'])


def downgrade() -> None:
    # Remove foreign key and column
    op.drop_constraint(None, 'ip_addresses', type_='foreignkey')
    op.drop_column('ip_addresses', 'prefix_id')
