"""Add Interface and Device models

Revision ID: add_interface_device_models
Revises: add_ip_addresses_relationship
Create Date: 2025-02-28 23:52:00.000000

"""
from alembic import op
import sqlalchemy as sa
import sqlmodel


# revision identifiers, used by Alembic.
revision = 'add_interface_device_models'
down_revision = 'add_ip_addresses_relationship'
branch_labels = None
depends_on = None


def upgrade():
    # Check if devices table exists
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    tables = inspector.get_table_names()
    
    # Create devices table if it doesn't exist
    if 'devices' not in tables:
        op.create_table(
            'devices',
            sa.Column('id', sa.Integer(), nullable=False),
            sa.Column('created_at', sa.DateTime(), nullable=True),
            sa.Column('updated_at', sa.DateTime(), nullable=True),
            sa.Column('name', sa.String(), nullable=False),
            sa.Column('description', sa.String(), nullable=True),
            sa.Column('site_id', sa.Integer(), nullable=True),
            sa.Column('tenant_id', sa.Integer(), nullable=True),
            sa.ForeignKeyConstraint(['site_id'], ['sites.id'], ),
            sa.ForeignKeyConstraint(['tenant_id'], ['tenants.id'], ),
            sa.PrimaryKeyConstraint('id')
        )
    
    # Create interfaces table if it doesn't exist
    if 'interfaces' not in tables:
        op.create_table(
            'interfaces',
            sa.Column('id', sa.Integer(), nullable=False),
            sa.Column('created_at', sa.DateTime(), nullable=True),
            sa.Column('updated_at', sa.DateTime(), nullable=True),
            sa.Column('name', sa.String(), nullable=False),
            sa.Column('description', sa.String(), nullable=True),
            sa.Column('device_id', sa.Integer(), nullable=True),
            sa.ForeignKeyConstraint(['device_id'], ['devices.id'], ),
            sa.PrimaryKeyConstraint('id')
        )
    
    # Check if interface_id column exists in ip_addresses table
    columns = [c['name'] for c in inspector.get_columns('ip_addresses')]
    if 'interface_id' not in columns:
        # Add interface_id foreign key to ip_addresses table
        op.add_column('ip_addresses', sa.Column('interface_id', sa.Integer(), nullable=True))
        op.create_foreign_key(None, 'ip_addresses', 'interfaces', ['interface_id'], ['id'])


def downgrade():
    # Remove interface_id foreign key from ip_addresses table
    op.drop_constraint(None, 'ip_addresses', type_='foreignkey')
    op.drop_column('ip_addresses', 'interface_id')
    
    # Drop interfaces table
    op.drop_table('interfaces')
    
    # Drop devices table
    op.drop_table('devices')
