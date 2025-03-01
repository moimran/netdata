"""device and interface relation and unique in aggregate

Revision ID: 84a32030ccf0
Revises: 83de508981bd
Create Date: 2025-03-01 11:43:02.888086

"""
from alembic import op
import sqlalchemy as sa
import sqlmodel
import sys
import os

# We don't need to import app.models.fields directly
# Just use sqlalchemy types instead


# revision identifiers, used by Alembic.
revision = '84a32030ccf0'
down_revision = '83de508981bd'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # ### commands auto generated by Alembic - please adjust! ###
    op.alter_column('aggregates', 'prefix',
                existing_type=sa.VARCHAR(),
                type_=sa.dialects.postgresql.CIDR(),
                existing_nullable=False,
                postgresql_using='prefix::cidr')
    op.create_unique_constraint('uq_aggregate', 'aggregates', ['prefix'])
    op.add_column('devices', sa.Column('ip_address_id', sa.Integer(), nullable=True))
    op.create_unique_constraint('uq_device_name', 'devices', ['name'])
    op.create_foreign_key(None, 'devices', 'ip_addresses', ['ip_address_id'], ['id'])
    op.alter_column('interfaces', 'device_id',
                existing_type=sa.INTEGER(),
                nullable=False)
    op.create_unique_constraint('uq_interface_name', 'interfaces', ['name'])
    op.alter_column('ip_addresses', 'address',
                existing_type=sa.VARCHAR(),
                type_=sa.dialects.postgresql.CIDR(),
                existing_nullable=False,
                postgresql_using='address::cidr')
    op.create_index(op.f('ix_ip_addresses_name'), 'ip_addresses', ['name'], unique=False)
    op.create_index(op.f('ix_ip_addresses_slug'), 'ip_addresses', ['slug'], unique=False)
    op.drop_constraint('ip_addresses_nat_inside_id_fkey', 'ip_addresses', type_='foreignkey')
    op.drop_column('ip_addresses', 'assigned_object_type')
    op.drop_column('ip_addresses', 'assigned_object_id')
    op.drop_column('ip_addresses', 'nat_inside_id')
    op.alter_column('ip_ranges', 'start_address',
                existing_type=sa.VARCHAR(),
                type_=sa.dialects.postgresql.CIDR(),
                existing_nullable=False,
                postgresql_using='start_address::cidr')
    op.alter_column('ip_ranges', 'end_address',
                existing_type=sa.VARCHAR(),
                type_=sa.dialects.postgresql.CIDR(),
                existing_nullable=False,
                postgresql_using='end_address::cidr')
    op.alter_column('prefixes', 'prefix',
                existing_type=sa.VARCHAR(),
                type_=sa.dialects.postgresql.CIDR(),
                existing_nullable=False,
                postgresql_using='prefix::cidr')
    op.create_unique_constraint(None, 'vrfs', ['rd'])
    op.create_unique_constraint(None, 'vrfs', ['name'])
    # ### end Alembic commands ###


def downgrade() -> None:
    # ### commands auto generated by Alembic - please adjust! ###
    op.drop_constraint(None, 'vrfs', type_='unique')
    op.drop_constraint(None, 'vrfs', type_='unique')
    op.alter_column('prefixes', 'prefix',
                existing_type=sa.dialects.postgresql.CIDR(),
                type_=sa.VARCHAR(),
                existing_nullable=False)
    op.alter_column('ip_ranges', 'end_address',
                existing_type=sa.dialects.postgresql.CIDR(),
                type_=sa.VARCHAR(),
                existing_nullable=False)
    op.alter_column('ip_ranges', 'start_address',
                existing_type=sa.dialects.postgresql.CIDR(),
                type_=sa.VARCHAR(),
                existing_nullable=False)
    op.add_column('ip_addresses', sa.Column('nat_inside_id', sa.INTEGER(), autoincrement=False, nullable=True))
    op.add_column('ip_addresses', sa.Column('assigned_object_id', sa.INTEGER(), autoincrement=False, nullable=True))
    op.add_column('ip_addresses', sa.Column('assigned_object_type', sa.VARCHAR(), autoincrement=False, nullable=True))
    op.create_foreign_key('ip_addresses_nat_inside_id_fkey', 'ip_addresses', 'ip_addresses', ['nat_inside_id'], ['id'])
    op.drop_index(op.f('ix_ip_addresses_slug'), table_name='ip_addresses')
    op.drop_index(op.f('ix_ip_addresses_name'), table_name='ip_addresses')
    op.alter_column('ip_addresses', 'address',
                existing_type=sa.dialects.postgresql.CIDR(),
                type_=sa.VARCHAR(),
                existing_nullable=False)
    op.drop_constraint('uq_interface_name', 'interfaces', type_='unique')
    op.alter_column('interfaces', 'device_id',
                existing_type=sa.INTEGER(),
                nullable=True)
    op.drop_constraint(None, 'devices', type_='foreignkey')
    op.drop_constraint('uq_device_name', 'devices', type_='unique')
    op.drop_column('devices', 'ip_address_id')
    op.drop_constraint('uq_aggregate', 'aggregates', type_='unique')
    op.alter_column('aggregates', 'prefix',
                existing_type=sa.dialects.postgresql.CIDR(),
                type_=sa.VARCHAR(),
                existing_nullable=False)
    # ### end Alembic commands ###
