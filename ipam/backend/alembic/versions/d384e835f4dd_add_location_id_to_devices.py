"""Add location_id to devices

Revision ID: d384e835f4dd
Revises: 7355bbe789de
Create Date: 2025-03-01 00:09:45.033183

"""
from alembic import op
import sqlalchemy as sa
import sqlmodel


# revision identifiers, used by Alembic.
revision = 'd384e835f4dd'
down_revision = '7355bbe789de'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # ### commands auto generated by Alembic - please adjust! ###
    op.add_column('devices', sa.Column('location_id', sa.Integer(), nullable=True))
    op.create_foreign_key(None, 'devices', 'locations', ['location_id'], ['id'])
    # ### end Alembic commands ###


def downgrade() -> None:
    # ### commands auto generated by Alembic - please adjust! ###
    op.drop_constraint(None, 'devices', type_='foreignkey')
    op.drop_column('devices', 'location_id')
    # ### end Alembic commands ###
