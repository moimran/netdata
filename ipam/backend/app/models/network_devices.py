import uuid
from datetime import datetime, timedelta
from typing import List, Optional, Dict, Any, TYPE_CHECKING

from sqlalchemy import Column, text, func
from sqlalchemy.dialects import postgresql
from sqlmodel import Field, SQLModel, Relationship

# Import the base model
from .base import BaseModel

if TYPE_CHECKING:
    # Add forward references if needed later
    pass

# --- Platform Type ---
# Inherits id, created_at, updated_at from BaseModel -> TimestampedModel
# Override name/slug/description as they don't seem applicable here.
class PlatformType(BaseModel, table=True):
    __tablename__ = "platform_type"

    # Override base fields
    name: Optional[str] = Field(default=None, index=True, nullable=True)
    slug: Optional[str] = Field(default=None, index=True, nullable=True)
    description: Optional[str] = Field(default=None, nullable=True)

    # Override inherited timestamp types if they used TIMESTAMPTZ
    created_at: datetime = Field(default_factory=datetime.utcnow, sa_column=Column(postgresql.TIMESTAMP(timezone=True), server_default=func.now(), nullable=False))
    updated_at: Optional[datetime] = Field(default=None, sa_column=Column(postgresql.TIMESTAMP(timezone=True), nullable=True))

    # Specific fields
    platform_signature: str = Field(max_length=100, unique=True, index=True)
    platform_type: str = Field(max_length=100, unique=True, index=True)
    command: Optional[str] = Field(default=None, max_length=100)
    ignore_platform: bool = Field(default=False)

    # Relationships
    net_jobs: List["NetJob"] = Relationship(back_populates="platform_type")
    device_inventories: List["DeviceInventory"] = Relationship(back_populates="platform_type")


# --- Net Jobs ---
# Inherits id, created_at, updated_at from BaseModel -> TimestampedModel
# Use 'job_name' as the 'name' field from BaseModel.
class NetJob(BaseModel, table=True):
    __tablename__ = "net_jobs"

    # Use job_name for the 'name' field, make slug optional
    name: str = Field(..., max_length=100, description="Job name")
    slug: Optional[str] = Field(default=None, index=True, nullable=True)
    description: Optional[str] = Field(default=None, nullable=True)

    # Override inherited timestamp types if they used TIMESTAMPTZ
    created_at: datetime = Field(default_factory=datetime.utcnow, sa_column=Column(postgresql.TIMESTAMP(timezone=True), server_default=func.now(), nullable=False))
    updated_at: Optional[datetime] = Field(default=None, sa_column=Column(postgresql.TIMESTAMP(timezone=True), nullable=True))

    # Specific fields
    job_uuid: uuid.UUID = Field(sa_column=Column(postgresql.UUID(as_uuid=True), unique=True, index=True, server_default=text("gen_random_uuid()"), nullable=False))
    platform_type_id: Optional[int] = Field(default=None, foreign_key="platform_type.id")
    command_list: List[str] = Field(sa_column=Column(postgresql.ARRAY(postgresql.TEXT), nullable=False))
    is_scheduled: bool = Field(default=False)
    schedule_interval: Optional[timedelta] = Field(default=None, sa_column=Column(postgresql.INTERVAL))
    next_run: Optional[datetime] = Field(default=None, sa_column=Column(postgresql.TIMESTAMP(timezone=True)))
    last_run: Optional[datetime] = Field(default=None, sa_column=Column(postgresql.TIMESTAMP(timezone=True)))
    connection_protocol: str = Field(default='ssh', max_length=50)
    connection_library: str = Field(default='NETMIKO', max_length=50)
    is_encrypted: bool = Field(default=False)
    is_parse: bool = Field(default=True)
    extra_config: Optional[Dict[str, Any]] = Field(default=None, sa_column=Column(postgresql.JSONB))
    status: str = Field(default='ACTIVE', max_length=50)
    # created_at, updated_at inherited

    # Relationship
    platform_type: Optional[PlatformType] = Relationship(back_populates="net_jobs")


# --- Device Inventory ---
# Inherits directly from SQLModel as it doesn't fit BaseModel structure.
class DeviceInventory(SQLModel, table=True):
    __tablename__ = "device_inventory"

    # Define columns explicitly
    time: datetime = Field(default_factory=datetime.utcnow, sa_column=Column(postgresql.TIMESTAMP(timezone=True), server_default=func.now(), nullable=False, index=True))
    device_uuid: uuid.UUID = Field(sa_column=Column(postgresql.UUID(as_uuid=True), primary_key=True, index=True))
    platform_type_id: Optional[int] = Field(default=None, foreign_key="platform_type.id")
    hostname: Optional[str] = Field(default=None, max_length=255)
    config_register: Optional[Dict[str, Any]] = Field(default=None, sa_column=Column(postgresql.JSONB))
    hardware: Optional[List[str]] = Field(default=None, sa_column=Column(postgresql.ARRAY(postgresql.TEXT)))
    mac_address: Optional[List[str]] = Field(default=None, sa_column=Column(postgresql.ARRAY(postgresql.TEXT)))
    release: Optional[str] = Field(default=None, max_length=50)
    reload_reason: Optional[str] = Field(default=None, sa_column=Column(postgresql.TEXT))
    restarted: Optional[datetime] = Field(default=None, sa_column=Column(postgresql.TIMESTAMP(timezone=True)))
    rommon: Optional[str] = Field(default=None, max_length=100)
    running_image: Optional[str] = Field(default=None, sa_column=Column(postgresql.TEXT))
    serial: Optional[List[str]] = Field(default=None, sa_column=Column(postgresql.ARRAY(postgresql.TEXT)))
    software_image: Optional[str] = Field(default=None, max_length=255)
    uptime_weeks: Optional[int] = Field(default=None)
    uptime_days: Optional[int] = Field(default=None)
    uptime_hours: Optional[int] = Field(default=None)
    uptime_minutes: Optional[int] = Field(default=None)
    uptime_years: Optional[int] = Field(default=None)
    version: Optional[str] = Field(default=None, max_length=100)

    # Relationship
    platform_type: Optional[PlatformType] = Relationship(back_populates="device_inventories")

    class Config:
        arbitrary_types_allowed = True
