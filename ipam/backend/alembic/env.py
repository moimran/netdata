from logging.config import fileConfig
import os
import sys
from sqlalchemy import create_engine
from alembic import context
from urllib.parse import quote_plus

# Add the parent directory to sys.path (insert at index 0 for priority)
project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, project_root)

# Import models and database configuration
# Explicitly import all model modules to ensure registration with metadata
from app.models import aggregate
from app.models import asn
from app.models import automation
from app.models import base # Import base if it defines a common base class or tables
from app.models import credential
from app.models import device
from app.models import deviceinventory
from app.models import fields # Import even if utils, just in case
from app.models import interface
from app.models import ip_address
from app.models import ip_constants # Import even if utils
from app.models import ip_prefix
from app.models import ip_utils # Import even if utils
from app.models import location
from app.models import platform
from app.models import region
from app.models import rir
from app.models import role
from app.models import site
from app.models import site_group
from app.models import tenant
from app.models import timescale # Import even if utils
from app.models import vlan
from app.models import vrf
from sqlmodel import SQLModel

# this is the Alembic Config object, which provides
# access to the values within the .ini file in use.
config = context.config

# Interpret the config file for Python logging.
# This line sets up loggers basically.
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# add your model's MetaData object here
# for 'autogenerate' support
target_metadata = SQLModel.metadata

# Create database URL with properly escaped password
password = quote_plus("moimran@123")
db_url = f"postgresql://postgres:{password}@localhost:5432/netdata"

# Create our own engine
engine = create_engine(db_url)

def run_migrations_offline() -> None:
    """Run migrations in 'offline' mode."""
    url = str(engine.url)
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
        include_schemas=True
    )

    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    """Run migrations in 'online' mode."""
    with engine.connect() as connection:
        context.configure(
            connection=connection,
            target_metadata=target_metadata,
            include_schemas=True
        )

        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
