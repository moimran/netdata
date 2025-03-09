"""Make name and slug optional in IP addresses

Revision ID: 9a8c7b6d5e4f
Revises: f2cd15f1f7a1
Create Date: 2025-03-09 15:05:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '9a8c7b6d5e4f'
down_revision = 'f2cd15f1f7a1'
branch_labels = None
depends_on = None


def upgrade():
    # Make name and slug columns nullable in ip_addresses table
    op.alter_column('ip_addresses', 'name',
               existing_type=sa.VARCHAR(),
               nullable=True)
    op.alter_column('ip_addresses', 'slug',
               existing_type=sa.VARCHAR(),
               nullable=True)


def downgrade():
    # Revert name and slug columns to non-nullable in ip_addresses table
    op.alter_column('ip_addresses', 'name',
               existing_type=sa.VARCHAR(),
               nullable=False)
    op.alter_column('ip_addresses', 'slug',
               existing_type=sa.VARCHAR(),
               nullable=False)
