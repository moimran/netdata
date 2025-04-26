from datetime import datetime
from typing import List, Optional, TYPE_CHECKING, ClassVar

from sqlalchemy import Column, func
from sqlalchemy.dialects import postgresql
from sqlmodel import Field, Relationship

# Import the base model
from .base import BaseModel

if TYPE_CHECKING:
    from .automation import NetJob
    from .deviceinventory import DeviceInventory
    pass

# --- Platform Type ---
# Inherits id, created_at, updated_at from BaseModel -> TimestampedModel
# Override name/slug/description as they don't seem applicable here.
class PlatformType(BaseModel, table=True):
    __tablename__: ClassVar[str] = "platform_type"
    __table_args__: ClassVar[dict] = {"schema": "ni"}

    # Override base fields
    vendor: str = Field(default=None, index=True, nullable=True)
    slug: str = Field(default=None, index=True, nullable=True)

    # Specific fields
    platform_signature: Optional[str] = Field(default=None, max_length=100, unique=True, index=True)
    platform_type: str = Field(max_length=100, unique=True, index=True)
    command: Optional[str] = Field(default=None, max_length=100)
    ignore_platform: bool = Field(default=False)

    # Relationships
    net_jobs: List["NetJob"] = Relationship(back_populates="platform_type")
    device_inventories: List["DeviceInventory"] = Relationship(back_populates="platform_type")

    class Config:
        arbitrary_types_allowed = True
