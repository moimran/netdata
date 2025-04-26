from logging.config import fileConfig
import os
import sys
from sqlalchemy import create_engine, engine_from_config, pool
from alembic import context
from sqlmodel import SQLModel as Base

# Add the parent directory to sys.path (insert at index 0 for priority)
project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, project_root)

# Import models and database configuration
# Explicitly import all model modules to ensure registration with metadata
from app.config import settings
from app.models import aggregate
from app.models import asn
from app.models import automation
from app.models import base
from app.models import fields
from app.models import interface
from app.models import ip_prefix
from app.models import ip_utils
from app.models import location
from app.models import platform
from app.models import region
from app.models import rir
from app.models import role
from app.models import site
from app.models import tenant
from app.models import vlan
from app.models import vrf

# this is the Alembic Config object, which provides
# access to the values within the .ini file in use.
config = context.config

# Interpret the config file for Python logging.
# This line sets up loggers basically.
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# add your model's MetaData object here
# for 'autogenerate' support
target_metadata = Base.metadata

def run_migrations_offline() -> None:
    """Run migrations in 'offline' mode.

    This configures the context with just a URL
    and not an Engine, though an Engine is acceptable
    here as well.  By skipping the Engine creation
    we don't even need a DBAPI to be available.

    Calls to context.execute() here emit the given string to the
    script output.

    """
    context.configure(
        url=settings.DATABASE_URL,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )

    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    """Run migrations in 'online' mode.

    In this scenario we need to create an Engine
    and associate a connection with the context.

    """
    # Create our own engine instead of using engine_from_config
    connectable = create_engine(settings.DATABASE_URL)

    with connectable.connect() as connection:
        context.configure(
            connection=connection,
            target_metadata=target_metadata
        )

        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
