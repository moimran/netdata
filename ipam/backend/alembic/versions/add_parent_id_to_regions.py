"""Add parent_id to regions

Revision ID: add_parent_id_to_regions
Revises: add_vlan_id_ranges_field
Create Date: 2025-02-28 21:32:00.000000

"""
from alembic import op
import sqlalchemy as sa
import sqlmodel


# revision identifiers, used by Alembic.
revision = 'add_parent_id_to_regions'
down_revision = 'add_vlan_id_ranges_field'
branch_labels = None
depends_on = None


def upgrade():
    # Add parent_id column to regions table
    op.add_column('regions', sa.Column('parent_id', sa.Integer(), nullable=True))
    
    # Add foreign key constraint
    op.create_foreign_key(
        'fk_regions_parent_id_regions',
        'regions', 'regions',
        ['parent_id'], ['id']
    )


def downgrade():
    # Drop foreign key constraint
    op.drop_constraint('fk_regions_parent_id_regions', 'regions', type_='foreignkey')
    
    # Drop parent_id column
    op.drop_column('regions', 'parent_id')
