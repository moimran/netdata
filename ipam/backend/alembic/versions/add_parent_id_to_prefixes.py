"""Add parent_id to prefixes

Revision ID: add_parent_id_to_prefixes
Revises: add_vlan_id_ranges_field
Create Date: 2025-02-28 23:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
import sqlmodel


# revision identifiers, used by Alembic.
revision = 'add_parent_id_to_prefixes'
down_revision = 'add_vlan_id_ranges_field'
branch_labels = None
depends_on = None


def upgrade():
    # Add parent_id column to prefixes table
    op.add_column('prefixes', sa.Column('parent_id', sa.Integer(), nullable=True))
    
    # Add foreign key constraint
    op.create_foreign_key(
        'fk_prefixes_parent_id_prefixes',
        'prefixes', 'prefixes',
        ['parent_id'], ['id']
    )
    
    # Add index on parent_id for faster lookups
    op.create_index(op.f('ix_prefixes_parent_id'), 'prefixes', ['parent_id'], unique=False)


def downgrade():
    # Drop index
    op.drop_index(op.f('ix_prefixes_parent_id'), table_name='prefixes')
    
    # Drop foreign key constraint
    op.drop_constraint('fk_prefixes_parent_id_prefixes', 'prefixes', type_='foreignkey')
    
    # Drop column
    op.drop_column('prefixes', 'parent_id')
