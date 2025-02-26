from typing import Optional, List
from sqlmodel import SQLModel, Field, Relationship
from sqlalchemy import String
from .base import BaseModel
from .ip_constants import IPAddressStatusEnum, IPAddressRoleEnum
from .fields import IPNetworkField, DNSNameStr
from .ip_utils import (
    validate_ip_address,
    get_ip_version,
    get_mask_length
)

class IPAddress(BaseModel, table=True):
    """
    An IPAddress represents an individual IPv4 or IPv6 address and its mask. The mask
    length should match what is configured in the real world. (Typically, only loopback
    interfaces are configured with /32 or /128 masks.)
    """
    __tablename__ = "ip_addresses"
    
    # Basic fields
    name: str = Field(default="", description="Name of the IP address")
    slug: str = Field(default="", description="URL-friendly name")
    
    # Fields specific to IPAddress
    address: str = IPNetworkField(
        description="IPv4 or IPv6 address with mask",
        index=True
    )
    status: IPAddressStatusEnum = Field(
        default=IPAddressStatusEnum.ACTIVE,
        description="The operational status of this IP"
    )
    role: Optional[IPAddressRoleEnum] = Field(
        default=None,
        description="The functional role of this IP"
    )
    dns_name: Optional[DNSNameStr] = Field(
        default=None,
        max_length=255,
        sa_type=String(255),
        description="Hostname or FQDN (not case-sensitive)"
    )
    
    # Foreign Keys
    vrf_id: Optional[int] = Field(default=None, foreign_key="vrfs.id")
    tenant_id: Optional[int] = Field(default=None, foreign_key="tenants.id")
    nat_inside_id: Optional[int] = Field(
        default=None,
        foreign_key="ip_addresses.id",
        description="The IP for which this address is the 'outside' IP"
    )
    
    # Generic foreign key equivalent for assigned_object
    assigned_object_type: Optional[str] = Field(default=None)
    assigned_object_id: Optional[int] = Field(default=None)
    
    # Relationships
    vrf: Optional["VRF"] = Relationship()
    tenant: Optional["Tenant"] = Relationship()
    nat_inside: Optional["IPAddress"] = Relationship(
        sa_relationship_kwargs={"remote_side": "IPAddress.id"}
    )
    nat_outside: List["IPAddress"] = Relationship(
        back_populates="nat_inside"
    )
    
    def clean(self) -> None:
        """Validate the IP address."""
        super().clean()
        
        # Validate assigned object
        if bool(self.assigned_object_type) != bool(self.assigned_object_id):
            raise ValueError(
                "Both assigned_object_type and assigned_object_id must be set together"
            )
    
    def get_duplicates(self) -> List["IPAddress"]:
        """Find any duplicate IP addresses within the same VRF."""
        from sqlmodel import select
        from sqlalchemy.ext.asyncio import AsyncSession
        
        # Note: This is a placeholder. In actual implementation,
        # you would pass the session and use it for the query
        return []
    
    def get_next_available_ip(self) -> Optional[str]:
        """Return the next available IP address within this IP's network."""
        from .ip_utils import get_available_ips
        
        # Get all IPs in the same network
        network = f"{self.address}"
        available = get_available_ips(network)
        
        # Find the current IP's position and return the next one
        try:
            current_index = available.index(str(self.address))
            if current_index < len(available) - 1:
                return available[current_index + 1]
        except ValueError:
            pass
        
        return None
    
    def get_related_ips(self) -> List["IPAddress"]:
        """Return all IPAddresses belonging to the same VRF."""
        from sqlmodel import select
        from sqlalchemy.ext.asyncio import AsyncSession
        
        # Note: This is a placeholder. In actual implementation,
        # you would pass the session and use it for the query
        return []
    
    @property
    def family(self) -> str:
        """Return the IP address family (4 or 6)."""
        version = get_ip_version(self.address)
        return str(version) if version else "4"
    
    @property
    def mask_length(self) -> int:
        """Return the IP address mask length."""
        length = get_mask_length(self.address)
        return length if length is not None else 0
    
    class Config:
        arbitrary_types_allowed = True
