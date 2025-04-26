import uuid
from datetime import datetime
from typing import List, Optional, Dict, Any, TYPE_CHECKING, ClassVar

from sqlalchemy import Column
from sqlalchemy.dialects import postgresql
from sqlmodel import Field, Relationship

from .base import BaseModel
from .fields import IPNetworkType

if TYPE_CHECKING:
    from .platform import PlatformType
    from .interface import Interface
    from .site import Site
    from .tenant import Tenant
    from .location import Location
    from .arp import ARP

class DeviceInventory(BaseModel, table=True):
    """
    DeviceInventory represents the detailed hardware and software information
    collected from network devices. This includes version information, hardware
    details, and runtime statistics.
    """
    __tablename__: ClassVar[str] = "device_inventory"
    __table_args__: ClassVar[dict] = {"schema": "ni"}

    # Basic fields
    hostname: Optional[str] = Field(default=None, max_length=255)
    platform_type_id: Optional[uuid.UUID] = Field(default=None, foreign_key="ni.platform_type.id")
    connection_type: Optional[str] = Field(default=None, max_length=100)
    
    # Network information
    management_ip: str = Field(
        default=None,
        description="Management IP address of the device",
        sa_column=Column(IPNetworkType)
    )
    
    # Configuration and hardware details
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
    serial: Optional[List[str]] = Field(
        default=None,
        sa_column=Column(postgresql.ARRAY(postgresql.TEXT))
    )
    
    # Software and version information
    release: Optional[str] = Field(default=None, max_length=50)
    version: Optional[str] = Field(default=None, max_length=100)
    running_image: Optional[str] = Field(
        default=None,
        sa_column=Column(postgresql.TEXT)
    )
    
    # Runtime information
    restarted: Optional[datetime] = Field(
        default=None,
        sa_column=Column(postgresql.TIMESTAMP(timezone=True))
    )
    reload_reason: Optional[str] = Field(
        default=None,
        sa_column=Column(postgresql.TEXT)
    )
    uptime_years: Optional[int] = Field(default=None)
    uptime_weeks: Optional[int] = Field(default=None)
    uptime_days: Optional[int] = Field(default=None)
    uptime_hours: Optional[int] = Field(default=None)
    uptime_minutes: Optional[int] = Field(default=None)

    # time took to complete ssh handshake in millisecond
    ssh_handshake_time: Optional[int] = Field(default=None)

    # Foreign Keys
    site_id: Optional[uuid.UUID] = Field(default=None, foreign_key="ipam.sites.id")
    tenant_id: uuid.UUID = Field(..., foreign_key="ipam.tenants.id", description="Tenant this device belongs to")
    location_id: Optional[uuid.UUID] = Field(default=None, foreign_key="ipam.locations.id")
    
    # Relationships
    platform_type: Optional["PlatformType"] = Relationship(back_populates="device_inventories")
    site: Optional["Site"] = Relationship(back_populates="device_inventories")
    tenant: "Tenant" = Relationship(back_populates="device_inventories")
    location: Optional["Location"] = Relationship(back_populates="device_inventories")
    interfaces: List["Interface"] = Relationship(back_populates="device_inventory")
    arp_entries: List["ARP"] = Relationship(back_populates="device")

    class Config:
        arbitrary_types_allowed = True
