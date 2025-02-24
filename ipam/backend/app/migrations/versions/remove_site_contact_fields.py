from alembic import op
import sqlalchemy as sa

revision = '2023_11_remove_site_fields'
down_revision = 'previous_migration_id'  # replace with actual previous migration id
branch_labels = None
depends_on = None

def upgrade():
    # Remove columns from ipam_site table
    op.drop_column('ipam_site', 'facility')
    op.drop_column('ipam_site', 'physical_address')
    op.drop_column('ipam_site', 'shipping_address')
    op.drop_column('ipam_site', 'latitude')
    op.drop_column('ipam_site', 'longitude')
    op.drop_column('ipam_site', 'contact_name')
    op.drop_column('ipam_site', 'contact_phone')
    op.drop_column('ipam_site', 'contact_email')
    op.drop_column('ipam_site', 'comments')

def downgrade():
    # Add back columns to ipam_site table
    op.add_column('ipam_site', sa.Column('facility', sa.String(), nullable=True))
    op.add_column('ipam_site', sa.Column('physical_address', sa.String(), nullable=True))
    op.add_column('ipam_site', sa.Column('shipping_address', sa.String(), nullable=True))
    op.add_column('ipam_site', sa.Column('latitude', sa.Float(), nullable=True))
    op.add_column('ipam_site', sa.Column('longitude', sa.Float(), nullable=True))
    op.add_column('ipam_site', sa.Column('contact_name', sa.String(), nullable=True))
    op.add_column('ipam_site', sa.Column('contact_phone', sa.String(), nullable=True))
    op.add_column('ipam_site', sa.Column('contact_email', sa.String(), nullable=True))
    op.add_column('ipam_site', sa.Column('comments', sa.String(), nullable=True))
