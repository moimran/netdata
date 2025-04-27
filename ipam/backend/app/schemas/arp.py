from typing import Optional
from uuid import UUID
from sqlmodel import SQLModel
from pydantic import Field

# Base schema for ARP entries
class ARPBase(SQLModel):
    ipv4_address: str = Field(..., description="IPv4 address of the ARP entry")
    mac_address: str = Field(..., description="MAC address associated with the IP")
    ip_arp_age: str = Field(..., description="Age of the ARP entry")
    interface_name: str = Field(..., description="Interface where the ARP entry was learned")
    physical_interface: Optional[str] = Field(default=None, description="Physical interface name")
    interface_module: Optional[str] = Field(default=None, description="Interface module information")
    arp_state: Optional[str] = Field(default=None, description="State of the ARP entry (e.g., REACHABLE, STALE)")
    ip_route_type: Optional[str] = Field(default=None, description="Type of IP route associated with this entry")
    vrf_name: Optional[str] = Field(default=None, description="VRF name if the ARP entry belongs to a specific VRF")
    device_id: UUID = Field(..., description="Device where this ARP entry was found")

class ARPCreate(ARPBase):
    pass

class ARPUpdate(SQLModel):
    ipv4_address: Optional[str] = None
    mac_address: Optional[str] = None
    ip_arp_age: Optional[str] = None
    interface_name: Optional[str] = None
    physical_interface: Optional[str] = None
    interface_module: Optional[str] = None
    arp_state: Optional[str] = None
    ip_route_type: Optional[str] = None
    vrf_name: Optional[str] = None
    device_id: Optional[UUID] = None

class ARPRead(ARPBase):
    id: int
