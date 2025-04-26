import uuid
from datetime import datetime
from typing import List, Optional, Dict, Any, TYPE_CHECKING, ClassVar

from sqlalchemy import Column
from sqlalchemy.dialects import postgresql
from sqlmodel import Field, SQLModel, Relationship

if TYPE_CHECKING:
    from .platform import PlatformType
    from .interface import Interface
    from .site import Site
    from .tenant import Tenant
    from .location import Location
    from .ip_address import IPAddress

# --- Device Inventory ---
# Inherits directly from SQLModel as it doesn't fit BaseModel structure.
class DeviceInventory(SQLModel, table=True):
    __tablename__: ClassVar[str] = "device_inventory"
    __table_args__: ClassVar[dict] = {"schema": "ni"}

    # Define columns explicitly
    device_uuid: uuid.UUID = Field(
        sa_column=Column(postgresql.UUID(as_uuid=True), primary_key=True, index=True)
    )
    platform_type_id: Optional[int] = Field(default=None, foreign_key="ni.platform_type.id")
    hostname: Optional[str] = Field(default=None, max_length=255)
    config_register: Optional[Dict[str, Any]] = Field(
        default=None,
        sa_column=Column(postgresql.JSONB)
    )
    hardware: Optional[List[str]] = Field(
        default=None,
        sa_column=Column(postgresql.ARRAY(postgresql.TEXT))
    )
    mac_address: Optional[List[str]] = Field(
        default=None,
        sa_column=Column(postgresql.ARRAY(postgresql.TEXT))
    )
    release: Optional[str] = Field(default=None, max_length=50)
    reload_reason: Optional[str] = Field(
        default=None,
        sa_column=Column(postgresql.TEXT)
    )
    restarted: Optional[datetime] = Field(
        default=None,
        sa_column=Column(postgresql.TIMESTAMP(timezone=True))
    )
    rommon: Optional[str] = Field(default=None, max_length=100)
    running_image: Optional[str] = Field(
        default=None,
        sa_column=Column(postgresql.TEXT)
    )
    serial: Optional[List[str]] = Field(
        default=None,
        sa_column=Column(postgresql.ARRAY(postgresql.TEXT))
    )
    software_image: Optional[str] = Field(default=None, max_length=255)
    uptime_weeks: Optional[int] = Field(default=None)
    uptime_days: Optional[int] = Field(default=None)
    uptime_hours: Optional[int] = Field(default=None)
    uptime_minutes: Optional[int] = Field(default=None)
    uptime_years: Optional[int] = Field(default=None)
    version: Optional[str] = Field(default=None, max_length=100)

    # Basic relationship fields
    site_id: Optional[uuid.UUID] = Field(default=None, foreign_key="ipam.sites.id")
    tenant_id: uuid.UUID = Field(..., foreign_key="ipam.tenants.id", description="Tenant this device belongs to")
    location_id: Optional[uuid.UUID] = Field(default=None, foreign_key="ipam.locations.id")
    
    # IP Address relationship
    ip_address_id: Optional[uuid.UUID] = Field(default=None, foreign_key="ipam.ip_addresses.id")
    
    # Relationships
    platform_type: Optional["PlatformType"] = Relationship(back_populates="device_inventories")
    site: Optional["Site"] = Relationship(back_populates="devices")
    tenant: "Tenant" = Relationship(back_populates="devices")
    location: Optional["Location"] = Relationship(back_populates="devices")
    interfaces: List["Interface"] = Relationship(back_populates="device")
    ip_address: Optional["IPAddress"] = Relationship()

    class Config:
        arbitrary_types_allowed = True
