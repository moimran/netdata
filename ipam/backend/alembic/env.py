from logging.config import fileConfig
import os
import sys
from sqlalchemy import engine_from_config, create_engine
from sqlalchemy import pool
from alembic import context
from urllib.parse import quote_plus

# Add the parent directory to sys.path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Import models and database configuration
from app.models import *  # This will register all models with SQLModel
from app.models.fields import IPNetworkType  # Import the custom field type
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
db_url = f"postgresql://postgres:{password}@localhost:5432/ipam"

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
    )

    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    """Run migrations in 'online' mode."""
    with engine.connect() as connection:
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
