import sys
import os

# Add the parent directory to sys.path to import app modules
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.database import engine
from sqlmodel import SQLModel

def drop_tables():
    print("Dropping all tables...")
    SQLModel.metadata.drop_all(engine)
    print("All tables dropped successfully!")

if __name__ == "__main__":
    drop_tables()
