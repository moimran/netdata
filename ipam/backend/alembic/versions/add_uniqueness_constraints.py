"""Add uniqueness constraints to various models

Revision ID: add_uniqueness_constraints
Revises: add_parent_id_to_prefixes
Create Date: 2025-02-28 23:42:00.000000

"""
from alembic import op
import sqlalchemy as sa
import sqlmodel


# revision identifiers, used by Alembic.
revision = 'add_uniqueness_constraints'
down_revision = 'add_parent_id_to_prefixes'
branch_labels = None
depends_on = None


def upgrade():
    # Add uniqueness constraints to Prefix model
    op.create_unique_constraint('uq_prefix_vrf', 'prefixes', ['prefix', 'vrf_id'])
    
    # Add uniqueness constraints to IPAddress model
    op.create_unique_constraint('uq_ipaddress_vrf', 'ip_addresses', ['address', 'vrf_id'])
    
    # Add uniqueness constraints to IPRange model
    op.create_unique_constraint('uq_iprange_vrf', 'ip_ranges', ['start_address', 'end_address', 'vrf_id'])
    
    # Add uniqueness constraints to VLAN model
    op.create_unique_constraint('uq_vlan_vid_site', 'vlans', ['vid', 'site_id'])
    op.create_unique_constraint('uq_vlan_vid_group', 'vlans', ['vid', 'group_id'])
    op.create_unique_constraint('uq_vlan_name_site', 'vlans', ['name', 'site_id'])
    op.create_unique_constraint('uq_vlan_name_group', 'vlans', ['name', 'group_id'])
    
    # Add uniqueness constraints to ASNRange model
    op.create_unique_constraint('uq_asnrange_rir', 'asn_ranges', ['start', 'end', 'rir_id'])


def downgrade():
    # Remove uniqueness constraints from Prefix model
    op.drop_constraint('uq_prefix_vrf', 'prefixes', type_='unique')
    
    # Remove uniqueness constraints from IPAddress model
    op.drop_constraint('uq_ipaddress_vrf', 'ip_addresses', type_='unique')
    
    # Remove uniqueness constraints from IPRange model
    op.drop_constraint('uq_iprange_vrf', 'ip_ranges', type_='unique')
    
    # Remove uniqueness constraints from VLAN model
    op.drop_constraint('uq_vlan_vid_site', 'vlans', type_='unique')
    op.drop_constraint('uq_vlan_vid_group', 'vlans', type_='unique')
    op.drop_constraint('uq_vlan_name_site', 'vlans', type_='unique')
    op.drop_constraint('uq_vlan_name_group', 'vlans', type_='unique')
    
    # Remove uniqueness constraints from ASNRange model
    op.drop_constraint('uq_asnrange_rir', 'asn_ranges', type_='unique')
