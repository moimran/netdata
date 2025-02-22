from sqlmodel import create_engine, Session
from typing import Generator

DATABASE_URL = "sqlite:///./ipam.db"  # Change this to your actual database URL

engine = create_engine(DATABASE_URL)

def get_session() -> Generator[Session, None, None]:
    with Session(engine) as session:
        yield session
