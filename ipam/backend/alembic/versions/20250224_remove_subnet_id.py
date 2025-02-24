"""remove subnet_id from ip_addresses

Revision ID: 20250224_remove_subnet
Revises: 
Create Date: 2025-02-24 22:53:01.000000

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = '20250224_remove_subnet'
down_revision = None
branch_labels = None
depends_on = None

def upgrade() -> None:
    # Drop foreign key constraint first
    op.drop_constraint('ip_addresses_subnet_id_fkey', 'ip_addresses', type_='foreignkey')
    
    # Then drop the column
    op.drop_column('ip_addresses', 'subnet_id')

def downgrade() -> None:
    # Add the column back
    op.add_column('ip_addresses', sa.Column('subnet_id', sa.Integer(), nullable=True))
    
    # Add foreign key constraint back
    op.create_foreign_key(
        'ip_addresses_subnet_id_fkey',
        'ip_addresses', 'subnets',
        ['subnet_id'], ['id']
    )
