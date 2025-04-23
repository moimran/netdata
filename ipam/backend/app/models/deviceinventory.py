import uuid
from datetime import datetime
from typing import List, Optional, Dict, Any, TYPE_CHECKING

from sqlalchemy import Column, func
from sqlalchemy.dialects import postgresql
from sqlmodel import Field, SQLModel, Relationship

if TYPE_CHECKING:
    from .platform import PlatformType
    pass

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
    platform_type: Optional["PlatformType"] = Relationship(back_populates="device_inventories")

    class Config:
        arbitrary_types_allowed = True
