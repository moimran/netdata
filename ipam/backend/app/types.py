"""
Custom type definitions for the application.
These types are used across models and migrations.
"""
import uuid
from sqlalchemy.types import TypeDecorator
from sqlalchemy.dialects import postgresql

class UUIDType(TypeDecorator):
    """Custom type for handling UUID in PostgreSQL"""
    impl = postgresql.UUID
    cache_ok = True

    def __class_getitem__(cls, *args, **kwargs):
        return cls

    def process_bind_param(self, value, dialect):
        if value is None:
            return value
        return uuid.UUID(str(value))

    def process_result_value(self, value, dialect):
        if value is None:
            return value
        return uuid.UUID(str(value)) 