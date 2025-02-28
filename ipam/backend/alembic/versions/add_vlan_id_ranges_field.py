"""Add vlan_id_ranges field to VLANGroup model

Revision ID: add_vlan_id_ranges_field
Revises: 5436b2789f76
Create Date: 2025-02-28 20:12:00.000000

"""
from alembic import op
import sqlalchemy as sa
import sqlmodel


# revision identifiers, used by Alembic.
revision = 'add_vlan_id_ranges_field'
down_revision = '5436b2789f76'
branch_labels = None
depends_on = None


def upgrade():
    # Add vlan_id_ranges column to vlan_groups table
    op.add_column('vlan_groups', sa.Column('vlan_id_ranges', sa.String(), nullable=True))


def downgrade():
    # Remove vlan_id_ranges column from vlan_groups table
    op.drop_column('vlan_groups', 'vlan_id_ranges')
