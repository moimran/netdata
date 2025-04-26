from typing import Optional, TYPE_CHECKING, ClassVar
import uuid
from datetime import datetime
import sqlalchemy as sa
from sqlalchemy import Column
from sqlmodel import Field, Relationship
from .base import BaseModel
from .fields import IPNetworkType

if TYPE_CHECKING:
    from .deviceinventory import DeviceInventory
    from .interface import Interface
    from .vrf import VRF

class ARP(BaseModel, table=True):
    """
    ARP (Address Resolution Protocol) table entry representing the mapping between
    IP addresses and MAC addresses on network interfaces. This includes both dynamic
    and static ARP entries along with their states and routing information.
    """
    __tablename__: ClassVar[str] = "arp_table"
    __table_args__ = {"schema": "ni"}

    # Basic fields
    ipv4_address: str = Field(
        ...,
        max_length=64,
        description="IPv4 address of the ARP entry",
        sa_column=Column(IPNetworkType)
    )
    mac_address: str = Field(
        ...,
        max_length=64,
        description="MAC address associated with the IP"
    )
    ip_arp_age: str = Field(
        ...,
        max_length=32,
        description="Age of the ARP entry"
    )

    # Interface information
    interface_name: str = Field(
        ...,
        max_length=128,
        description="Interface where the ARP entry was learned"
    )
    physical_interface: Optional[str] = Field(
        default=None,
        max_length=128,
        description="Physical interface name"
    )
    interface_module: Optional[str] = Field(
        default=None,
        max_length=128,
        description="Interface module information"
    )

    # ARP and routing information
    arp_state: Optional[str] = Field(
        default=None,
        max_length=128,
        description="State of the ARP entry (e.g., REACHABLE, STALE)"
    )
    ip_route_type: Optional[str] = Field(
        default=None,
        max_length=128,
        description="Type of IP route associated with this entry"
    )
    vrf_name: Optional[str] = Field(
        default=None,
        max_length=64,
        description="VRF name if the ARP entry belongs to a specific VRF"
    )

    # Foreign Keys
    device_id: uuid.UUID = Field(
        ...,
        foreign_key="ni.device_inventory.id",
        description="Device where this ARP entry was found"
    )

    # Relationships
    device: "DeviceInventory" = Relationship(back_populates="arp_entries")

    class Config:
        arbitrary_types_allowed = True
