"""Remove name and slug from prefix, update ip address and interface relationships

Revision ID: 8f3a2b4c5d6e
Revises: a626cf22a621
Create Date: 2025-03-12

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '8f3a2b4c5d6e'
down_revision = 'a626cf22a621'
branch_labels = None
depends_on = None


def upgrade():
    # Remove name and slug from prefix
    op.drop_column('prefixes', 'name')
    op.drop_column('prefixes', 'slug')
    
    # Remove interface_id from ip_addresses
    # First check if the constraint exists
    from sqlalchemy import inspect
    from sqlalchemy.engine.reflection import Inspector
    conn = op.get_bind()
    inspector = Inspector.from_engine(conn)
    foreign_keys = inspector.get_foreign_keys('ip_addresses')
    constraint_exists = any(fk.get('name') == 'fk_ip_addresses_interface_id' for fk in foreign_keys)
    
    # Only try to drop the constraint if it exists
    if constraint_exists:
        op.drop_constraint('fk_ip_addresses_interface_id', 'ip_addresses', type_='foreignkey')
    
    # Drop the column regardless
    op.drop_column('ip_addresses', 'interface_id')
    
    # Add ip_address_id to interfaces
    op.add_column('interfaces', sa.Column('ip_address_id', sa.Integer(), nullable=True))
    op.create_foreign_key('fk_interfaces_ip_address_id', 'interfaces', 'ip_addresses', ['ip_address_id'], ['id'])


def downgrade():
    # Add name and slug back to prefix
    op.add_column('prefixes', sa.Column('name', sa.String(), nullable=True))
    op.add_column('prefixes', sa.Column('slug', sa.String(), nullable=True))
    
    # Remove ip_address_id from interfaces
    # First check if the constraint exists
    from sqlalchemy import inspect
    from sqlalchemy.engine.reflection import Inspector
    conn = op.get_bind()
    inspector = Inspector.from_engine(conn)
    foreign_keys = inspector.get_foreign_keys('interfaces')
    constraint_exists = any(fk.get('name') == 'fk_interfaces_ip_address_id' for fk in foreign_keys)
    
    # Only try to drop the constraint if it exists
    if constraint_exists:
        op.drop_constraint('fk_interfaces_ip_address_id', 'interfaces', type_='foreignkey')
    
    op.drop_column('interfaces', 'ip_address_id')
    
    # Add interface_id back to ip_addresses
    op.add_column('ip_addresses', sa.Column('interface_id', sa.Integer(), nullable=True))
    op.create_foreign_key('fk_ip_addresses_interface_id', 'ip_addresses', 'interfaces', ['interface_id'], ['id'])
