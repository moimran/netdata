"""add_credential_fields_to_devices

Revision ID: f2cd15f1f7a1
Revises: 6462281a55cb
Create Date: 2025-03-02 14:50:39.892559

"""
from alembic import op
import sqlalchemy as sa
import sqlmodel


# revision identifiers, used by Alembic.
revision = 'f2cd15f1f7a1'
down_revision = '6462281a55cb'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # ### commands auto generated by Alembic - please adjust! ###
    op.add_column('credentials', sa.Column('is_default', sa.Boolean(), server_default='false', nullable=False))
    op.alter_column('credentials', 'username',
               existing_type=sa.VARCHAR(),
               nullable=False)
    op.alter_column('credentials', 'password',
               existing_type=sa.VARCHAR(),
               nullable=False)
    op.create_index(op.f('ix_credentials_name'), 'credentials', ['name'], unique=False)
    op.add_column('devices', sa.Column('credential_name', sqlmodel.sql.sqltypes.AutoString(), nullable=True))
    op.add_column('devices', sa.Column('fallback_credential_name', sqlmodel.sql.sqltypes.AutoString(), nullable=True))
    op.create_foreign_key(None, 'devices', 'credentials', ['fallback_credential_name'], ['name'])
    op.create_foreign_key(None, 'devices', 'credentials', ['credential_name'], ['name'])
    # ### end Alembic commands ###


def downgrade() -> None:
    # ### commands auto generated by Alembic - please adjust! ###
    op.drop_constraint(None, 'devices', type_='foreignkey')
    op.drop_constraint(None, 'devices', type_='foreignkey')
    op.drop_column('devices', 'fallback_credential_name')
    op.drop_column('devices', 'credential_name')
    op.drop_index(op.f('ix_credentials_name'), table_name='credentials')
    op.alter_column('credentials', 'password',
               existing_type=sa.VARCHAR(),
               nullable=True)
    op.alter_column('credentials', 'username',
               existing_type=sa.VARCHAR(),
               nullable=True)
    op.drop_column('credentials', 'is_default')
    # ### end Alembic commands ###
