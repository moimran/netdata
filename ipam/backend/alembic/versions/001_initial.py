"""initial

Revision ID: 001
Create Date: 2025-02-22 12:30:00.000000

"""
from alembic import op
import sqlalchemy as sa
import sqlmodel


# revision identifiers, used by Alembic.
revision = '001'
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Create Region table
    op.create_table('ipam_region',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(), nullable=False),
        sa.Column('slug', sa.String(), nullable=False),
        sa.Column('parent_id', sa.Integer(), nullable=True),
        sa.Column('description', sa.String(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['parent_id'], ['ipam_region.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_ipam_region_name'), 'ipam_region', ['name'], unique=False)
    op.create_index(op.f('ix_ipam_region_slug'), 'ipam_region', ['slug'], unique=False)

    # Create SiteGroup table
    op.create_table('ipam_sitegroup',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(), nullable=False),
        sa.Column('slug', sa.String(), nullable=False),
        sa.Column('parent_id', sa.Integer(), nullable=True),
        sa.Column('description', sa.String(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['parent_id'], ['ipam_sitegroup.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_ipam_sitegroup_name'), 'ipam_sitegroup', ['name'], unique=False)
    op.create_index(op.f('ix_ipam_sitegroup_slug'), 'ipam_sitegroup', ['slug'], unique=False)

    # Create Site table
    op.create_table('ipam_site',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(), nullable=False),
        sa.Column('slug', sa.String(), nullable=False),
        sa.Column('status', sa.String(), nullable=False),
        sa.Column('region_id', sa.Integer(), nullable=True),
        sa.Column('site_group_id', sa.Integer(), nullable=True),
        sa.Column('latitude', sa.Float(), nullable=True),
        sa.Column('longitude', sa.Float(), nullable=True),
        sa.Column('address', sa.String(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['region_id'], ['ipam_region.id'], ),
        sa.ForeignKeyConstraint(['site_group_id'], ['ipam_sitegroup.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_ipam_site_name'), 'ipam_site', ['name'], unique=False)
    op.create_index(op.f('ix_ipam_site_slug'), 'ipam_site', ['slug'], unique=False)
    op.create_index(op.f('ix_ipam_site_status'), 'ipam_site', ['status'], unique=False)

    # Create VRF table
    op.create_table('ipam_vrf',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(), nullable=False),
        sa.Column('rd', sa.String(), nullable=False),
        sa.Column('enforce_unique', sa.Boolean(), nullable=False),
        sa.Column('description', sa.String(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('rd')
    )
    op.create_index(op.f('ix_ipam_vrf_name'), 'ipam_vrf', ['name'], unique=False)

    # Create RIR table
    op.create_table('ipam_rir',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(), nullable=False),
        sa.Column('slug', sa.String(), nullable=False),
        sa.Column('description', sa.String(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_ipam_rir_name'), 'ipam_rir', ['name'], unique=False)
    op.create_index(op.f('ix_ipam_rir_slug'), 'ipam_rir', ['slug'], unique=False)

    # Create Role table
    op.create_table('ipam_role',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(), nullable=False),
        sa.Column('slug', sa.String(), nullable=False),
        sa.Column('description', sa.String(), nullable=True),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_ipam_role_name'), 'ipam_role', ['name'], unique=False)
    op.create_index(op.f('ix_ipam_role_slug'), 'ipam_role', ['slug'], unique=False)

    # Create Aggregate table
    op.create_table('ipam_aggregate',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('prefix', sa.String(), nullable=False),
        sa.Column('rir_id', sa.Integer(), nullable=False),
        sa.Column('date_added', sa.DateTime(), nullable=False),
        sa.Column('description', sa.String(), nullable=True),
        sa.ForeignKeyConstraint(['rir_id'], ['ipam_rir.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_ipam_aggregate_prefix'), 'ipam_aggregate', ['prefix'], unique=False)

    # Create Prefix table
    op.create_table('ipam_prefix',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('prefix', sa.String(), nullable=False),
        sa.Column('vrf_id', sa.Integer(), nullable=True),
        sa.Column('aggregate_id', sa.Integer(), nullable=True),
        sa.Column('role_id', sa.Integer(), nullable=True),
        sa.Column('site_id', sa.Integer(), nullable=True),
        sa.Column('status', sa.String(), nullable=False),
        sa.Column('description', sa.String(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['aggregate_id'], ['ipam_aggregate.id'], ),
        sa.ForeignKeyConstraint(['role_id'], ['ipam_role.id'], ),
        sa.ForeignKeyConstraint(['site_id'], ['ipam_site.id'], ),
        sa.ForeignKeyConstraint(['vrf_id'], ['ipam_vrf.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_ipam_prefix_prefix'), 'ipam_prefix', ['prefix'], unique=False)
    op.create_index(op.f('ix_ipam_prefix_status'), 'ipam_prefix', ['status'], unique=False)

    # Create IPRange table
    op.create_table('ipam_ip_range',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('start_address', sa.String(), nullable=False),
        sa.Column('end_address', sa.String(), nullable=False),
        sa.Column('prefix_id', sa.Integer(), nullable=False),
        sa.Column('vrf_id', sa.Integer(), nullable=True),
        sa.Column('status', sa.String(), nullable=False),
        sa.Column('description', sa.String(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['prefix_id'], ['ipam_prefix.id'], ),
        sa.ForeignKeyConstraint(['vrf_id'], ['ipam_vrf.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_ipam_ip_range_end_address'), 'ipam_ip_range', ['end_address'], unique=False)
    op.create_index(op.f('ix_ipam_ip_range_start_address'), 'ipam_ip_range', ['start_address'], unique=False)
    op.create_index(op.f('ix_ipam_ip_range_status'), 'ipam_ip_range', ['status'], unique=False)

    # Create IPAddress table
    op.create_table('ipam_ip_address',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('address', sa.String(), nullable=False),
        sa.Column('vrf_id', sa.Integer(), nullable=True),
        sa.Column('prefix_id', sa.Integer(), nullable=True),
        sa.Column('status', sa.String(), nullable=False),
        sa.Column('description', sa.String(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['prefix_id'], ['ipam_prefix.id'], ),
        sa.ForeignKeyConstraint(['vrf_id'], ['ipam_vrf.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_ipam_ip_address_address'), 'ipam_ip_address', ['address'], unique=False)
    op.create_index(op.f('ix_ipam_ip_address_status'), 'ipam_ip_address', ['status'], unique=False)


def downgrade() -> None:
    op.drop_table('ipam_ip_address')
    op.drop_table('ipam_ip_range')
    op.drop_table('ipam_prefix')
    op.drop_table('ipam_aggregate')
    op.drop_table('ipam_role')
    op.drop_table('ipam_rir')
    op.drop_table('ipam_vrf')
    op.drop_table('ipam_site')
    op.drop_table('ipam_sitegroup')
    op.drop_table('ipam_region')
