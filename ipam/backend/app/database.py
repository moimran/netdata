from sqlmodel import Session, create_engine
from .config import settings

# Export this for Alembic
SQLALCHEMY_DATABASE_URL = settings.DATABASE_URL

engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    pool_pre_ping=True,  # Enable connection health checks
    pool_size=5,         # Set the connection pool size
    max_overflow=10      # Allow up to 10 connections beyond pool_size
)

def get_session():
    with Session(engine) as session:
        yield session
