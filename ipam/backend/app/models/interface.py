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
    from .vrf import VRF

class Interface(BaseModel, table=True):
    """
    An Interface represents a network interface on a device, including its physical,
    logical, and protocol-specific configurations.
    """
    __tablename__: ClassVar[str] = "interfaces"
    __table_args__: ClassVar[tuple] = (
        sa.UniqueConstraint('interface_name', name='uq_interface_name'),
        {"schema": "ni"}
    )
    
    # Basic identification
    interface_name: str = Field(..., max_length=128, description="Name of the interface")
    
    # Status and Protocol
    interface_status: Optional[str] = Field(default=None, max_length=64)
    protocol_status: Optional[str] = Field(default=None, max_length=64)
    operational_mode: Optional[str] = Field(default=None, max_length=64)
    administrative_mode: Optional[str] = Field(default=None, max_length=64)
    
    # Hardware and Physical
    hardware_type: str = Field(..., max_length=64)
    mac_address: str = Field(..., max_length=64)
    bia: str = Field(..., max_length=14, description="Burned-in MAC address")
    media_type: Optional[str] = Field(default=None, max_length=32)
    
    # IP Addressing
    ipv4_address: Optional[str] = Field(
        default=None, 
        max_length=64,
        sa_column=Column(IPNetworkType)
    )
    subnet_mask: Optional[str] = Field(default=None, max_length=24)
    ipv6_address: Optional[str] = Field(
        default=None, 
        max_length=64,
        sa_column=Column(IPNetworkType)
    )
    virtual_ipv4_address: Optional[str] = Field(
        default=None, 
        max_length=64,
        sa_column=Column(IPNetworkType)
    )
    
    # Interface Properties
    mtu: Optional[str] = Field(default=None, max_length=16)
    duplex: Optional[str] = Field(default=None, max_length=16)
    speed: Optional[str] = Field(default=None, max_length=32)
    bandwidth: Optional[str] = Field(default=None, max_length=32)
    
    # Port Channel
    net_port_channel_id: Optional[int] = Field(default=None, max_length=16)
    group_number: Optional[str] = Field(default=None, max_length=8)
    group_name: Optional[str] = Field(default=None, max_length=64)
    
    # VLAN Configuration
    native_vlan: Optional[str] = Field(default=None, max_length=8)
    access_vlan: Optional[str] = Field(default=None, max_length=8)
    voice_vlan: Optional[str] = Field(default=None, max_length=8)
    switchport: Optional[str] = Field(default=None, max_length=32)
    switchport_monitor: Optional[str] = Field(default=None, max_length=32)
    trunking_vlans: Optional[str] = Field(default=None, max_length=2048)
    
    # HSRP Configuration
    version: Optional[str] = Field(default=None, max_length=8)
    preempt: Optional[str] = Field(default=None, max_length=20)
    active_router: Optional[str] = Field(default=None, max_length=20)
    active_virtual_mac: Optional[str] = Field(default=None, max_length=32)
    hsrp_router_state: Optional[str] = Field(default=None, max_length=32)
    configured_priority: Optional[str] = Field(default=None, max_length=8)
    priority: Optional[str] = Field(default=None, max_length=8)
    standby_router: Optional[str] = Field(default=None, max_length=20)
    standby_router_priority: Optional[str] = Field(default=None, max_length=8)
    num_state_changes: Optional[str] = Field(default=None, max_length=12)
    last_state_change: Optional[str] = Field(default=None, max_length=20)
    
    # Security and Routing
    interface_zone: Optional[str] = Field(default=None, max_length=32)
    
    # Updated: Replace vrf_name string with proper foreign key relationship
    vrf_id: Optional[uuid.UUID] = Field(default=None, foreign_key="ipam.vrfs.id")
    
    # Foreign Keys
    device_id: uuid.UUID = Field(..., foreign_key="ni.device_inventory.id")
    
    # Relationships
    device_inventory: "DeviceInventory" = Relationship(back_populates="interfaces")
    vrf: Optional["VRF"] = Relationship(back_populates="interfaces")

    class Config:
        arbitrary_types_allowed = True
