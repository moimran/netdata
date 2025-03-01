"""Make slug fields optional

Revision ID: make_slug_fields_optional
Revises: a626cf22a621
Create Date: 2025-03-01 17:43:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = 'make_slug_fields_optional'
down_revision = 'a626cf22a621'
branch_labels = None
depends_on = None


def upgrade():
    # Make slug field optional in regions table
    op.alter_column('regions', 'slug',
               existing_type=sa.VARCHAR(),
               nullable=True)
    
    # Make slug field optional in site_groups table
    op.alter_column('site_groups', 'slug',
               existing_type=sa.VARCHAR(),
               nullable=True)
    
    # Make slug field optional in sites table
    op.alter_column('sites', 'slug',
               existing_type=sa.VARCHAR(),
               nullable=True)
    
    # Make slug field optional in locations table
    op.alter_column('locations', 'slug',
               existing_type=sa.VARCHAR(),
               nullable=True)
    
    # Make slug field optional in vlans table
    op.alter_column('vlans', 'slug',
               existing_type=sa.VARCHAR(),
               nullable=True)
    
    # Make slug field optional in vlan_groups table
    op.alter_column('vlan_groups', 'slug',
               existing_type=sa.VARCHAR(),
               nullable=True)
    
    # Make slug field optional in route_targets table
    op.alter_column('route_targets', 'slug',
               existing_type=sa.VARCHAR(),
               nullable=True)
    
    # Make slug field optional in rirs table
    op.alter_column('rirs', 'slug',
               existing_type=sa.VARCHAR(),
               nullable=True)
    
    # Make slug field optional in roles table
    op.alter_column('roles', 'slug',
               existing_type=sa.VARCHAR(),
               nullable=True)
    
    # Make slug field optional in devices table
    op.alter_column('devices', 'slug',
               existing_type=sa.VARCHAR(),
               nullable=True)
    
    # Make slug field optional in interfaces table
    op.alter_column('interfaces', 'slug',
               existing_type=sa.VARCHAR(),
               nullable=True)
    
    # Make slug field optional in asns table
    op.alter_column('asns', 'slug',
               existing_type=sa.VARCHAR(),
               nullable=True)
    
    # Make slug field optional in asn_ranges table
    op.alter_column('asn_ranges', 'slug',
               existing_type=sa.VARCHAR(),
               nullable=True)
    
    # Make slug field optional in tenants table
    op.alter_column('tenants', 'slug',
               existing_type=sa.VARCHAR(),
               nullable=True)


def downgrade():
    # Make slug field required again in regions table
    op.alter_column('regions', 'slug',
               existing_type=sa.VARCHAR(),
               nullable=False)
    
    # Make slug field required again in site_groups table
    op.alter_column('site_groups', 'slug',
               existing_type=sa.VARCHAR(),
               nullable=False)
    
    # Make slug field required again in sites table
    op.alter_column('sites', 'slug',
               existing_type=sa.VARCHAR(),
               nullable=False)
    
    # Make slug field required again in locations table
    op.alter_column('locations', 'slug',
               existing_type=sa.VARCHAR(),
               nullable=False)
    
    # Make slug field required again in vlans table
    op.alter_column('vlans', 'slug',
               existing_type=sa.VARCHAR(),
               nullable=False)
    
    # Make slug field required again in vlan_groups table
    op.alter_column('vlan_groups', 'slug',
               existing_type=sa.VARCHAR(),
               nullable=False)
    
    # Make slug field required again in route_targets table
    op.alter_column('route_targets', 'slug',
               existing_type=sa.VARCHAR(),
               nullable=False)
    
    # Make slug field required again in rirs table
    op.alter_column('rirs', 'slug',
               existing_type=sa.VARCHAR(),
               nullable=False)
    
    # Make slug field required again in roles table
    op.alter_column('roles', 'slug',
               existing_type=sa.VARCHAR(),
               nullable=False)
    
    # Make slug field required again in devices table
    op.alter_column('devices', 'slug',
               existing_type=sa.VARCHAR(),
               nullable=False)
    
    # Make slug field required again in interfaces table
    op.alter_column('interfaces', 'slug',
               existing_type=sa.VARCHAR(),
               nullable=False)
    
    # Make slug field required again in asns table
    op.alter_column('asns', 'slug',
               existing_type=sa.VARCHAR(),
               nullable=False)
    
    # Make slug field required again in asn_ranges table
    op.alter_column('asn_ranges', 'slug',
               existing_type=sa.VARCHAR(),
               nullable=False)
    
    # Make slug field required again in tenants table
    op.alter_column('tenants', 'slug',
               existing_type=sa.VARCHAR(),
               nullable=False)
