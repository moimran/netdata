from sqlmodel import SQLModel
from .database import engine
from .models import *

def drop_all_tables():
    print("Dropping all tables...")
    SQLModel.metadata.drop_all(engine)
    print("All tables dropped successfully!")

if __name__ == "__main__":
    drop_all_tables()
