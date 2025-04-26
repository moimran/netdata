from logging.config import fileConfig
import os
import sys
from sqlalchemy import create_engine, engine_from_config, pool
from alembic import context
from sqlmodel import SQLModel as Base
from sqlalchemy.sql.sqltypes import TypeDecorator

# Add the backend directory to sys.path
backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, backend_dir)

# Import models and database configuration
from app.config import Settings
from app.types import UUIDType
from app.models.fields import IPNetworkType
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# Import all models to ensure they are registered with SQLModel
from app.models.aggregate import *
from app.models.asn import *
from app.models.automation import *
from app.models.base import *
from app.models.fields import *
from app.models.interface import *
from app.models.ip_prefix import *
from app.models.ip_address import *
from app.models.ip_utils import *
from app.models.location import *
from app.models.platform import *
from app.models.region import *
from app.models.rir import *
from app.models.role import *
from app.models.site import *
from app.models.tenant import *
from app.models.vlan import *
from app.models.vrf import *

# Create settings instance
settings = Settings()

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

def render_item(type_, obj, autogen_context):
    """Apply custom rendering for specific types."""
    # Handle UUIDType
    if isinstance(type_, UUIDType):
        autogen_context.imports.add("from sqlalchemy import Uuid")
        return "sa.Uuid()"
    
    # Handle IPNetworkType
    if isinstance(type_, IPNetworkType):
        autogen_context.imports.add("from sqlalchemy.dialects.postgresql import CIDR")
        return "postgresql.CIDR()"

    # Default rendering
    return False

def include_object(object, name, type_, reflected, compare_to):
    """Determine which database objects should be included in the autogeneration."""
    return True

def get_url() -> str:
    """Get the database URL from environment."""
    return settings.DATABASE_URL

def run_migrations_offline() -> None:
    """Run migrations in 'offline' mode.

    This configures the context with just a URL
    and not an Engine, though an Engine is acceptable
    here as well.  By skipping the Engine creation
    we don't even need a DBAPI to be available.

    Calls to context.execute() here emit the given string to the
    script output.
    """
    url = get_url()
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
        include_schemas=True,
        render_item=render_item,
        include_object=include_object,
        compare_type=True,
        user_module_prefix=None,
    )

    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    """Run migrations in 'online' mode."""
    # Create our own engine instead of using engine_from_config
    connectable = create_engine(get_url())

    with connectable.connect() as connection:
        context.configure(
            connection=connection,
            target_metadata=target_metadata,
            include_schemas=True,
            render_item=render_item,
            include_object=include_object,
            compare_type=True,
            user_module_prefix=None,
        )

        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
