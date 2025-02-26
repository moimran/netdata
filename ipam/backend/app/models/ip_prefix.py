from typing import Optional, List, TYPE_CHECKING
from sqlmodel import SQLModel, Field, Relationship
from .base import BaseModel
from .ip_constants import PrefixStatusEnum, IPRangeStatusEnum
from .fields import IPNetworkField
from .ip_utils import (
    validate_ip_network,
    calculate_ip_range_size,
    get_available_ips,
    calculate_prefix_utilization
)

if TYPE_CHECKING:
    from .site import Site
    from .vrf import VRF
    from .tenant import Tenant
    from .vlan import VLAN
    from .role import Role

class Prefix(BaseModel, table=True):
    """
    A Prefix represents an IPv4 or IPv6 network, including mask length. Prefixes can
    optionally be assigned to Sites and VRFs. A Prefix must be assigned a status and
    may optionally be assigned a user-defined Role. A Prefix can also be assigned to
    a VLAN where appropriate.
    """
    __tablename__ = "prefixes"
    
    # Basic fields
    name: str = Field(default="", description="Name of the prefix")
    slug: str = Field(default="", description="URL-friendly name")
    description: Optional[str] = Field(default=None, description="Brief description")
    
    # Fields specific to Prefix
    prefix: str = IPNetworkField(
        description="IPv4 or IPv6 network with mask",
        index=True
    )
    status: PrefixStatusEnum = Field(
        default=PrefixStatusEnum.ACTIVE,
        description="Operational status of this prefix"
    )
    is_pool: bool = Field(
        default=False,
        description="All IP addresses within this prefix are considered usable"
    )
    mark_utilized: bool = Field(
        default=False,
        description="Treat as fully utilized"
    )
    
    # Internal tracking fields
    depth: int = Field(default=0, description="Depth in the prefix hierarchy")
    child_count: int = Field(default=0, description="Number of child prefixes")
    
    # Foreign Keys
    site_id: Optional[int] = Field(default=None, foreign_key="sites.id")
    vrf_id: Optional[int] = Field(default=None, foreign_key="vrfs.id")
    tenant_id: Optional[int] = Field(default=None, foreign_key="tenants.id")
    vlan_id: Optional[int] = Field(default=None, foreign_key="vlans.id")
    role_id: Optional[int] = Field(default=None, foreign_key="roles.id")
    
    # Relationships
    site: Optional["Site"] = Relationship(back_populates="prefixes")
    vrf: Optional["VRF"] = Relationship(back_populates="prefixes")
    tenant: Optional["Tenant"] = Relationship(back_populates="prefixes")
    vlan: Optional["VLAN"] = Relationship(back_populates="prefixes")
    role: Optional["Role"] = Relationship(back_populates="prefixes")
    
    class Config:
        arbitrary_types_allowed = True
    
    def clean(self) -> None:
        """Validate the prefix."""
        super().clean()
        validate_ip_network(self.prefix)
    
    def get_available_ips(self) -> List[str]:
        """Return all available IPs within this prefix."""
        return get_available_ips(self.prefix)
    
    def get_first_available_ip(self) -> Optional[str]:
        """Return the first available IP within the prefix."""
        available = self.get_available_ips()
        return available[0] if available else None
    
    def get_utilization(self) -> float:
        """Calculate prefix utilization percentage."""
        return calculate_prefix_utilization(self.prefix)


class IPRange(BaseModel, table=True):
    """
    A range of IP addresses, defined by start and end addresses.
    """
    __tablename__ = "ip_ranges"
    
    # Basic fields
    description: Optional[str] = Field(default=None, description="Brief description")
    
    # Fields specific to IPRange
    start_address: str = IPNetworkField(
        description="IPv4 or IPv6 start address",
        index=True
    )
    end_address: str = IPNetworkField(
        description="IPv4 or IPv6 end address",
        index=True
    )
    size: int = Field(default=0)
    status: IPRangeStatusEnum = Field(
        default=IPRangeStatusEnum.ACTIVE,
        description="Operational status of this range"
    )
    mark_utilized: bool = Field(
        default=False,
        description="Treat as fully utilized"
    )
    
    # Foreign Keys
    vrf_id: Optional[int] = Field(default=None, foreign_key="vrfs.id")
    tenant_id: Optional[int] = Field(default=None, foreign_key="tenants.id")
    
    # Relationships
    vrf: Optional["VRF"] = Relationship(back_populates="ip_ranges")
    tenant: Optional["Tenant"] = Relationship(back_populates="ip_ranges")
    
    class Config:
        arbitrary_types_allowed = True
    
    def clean(self) -> None:
        """Validate the IP range."""
        super().clean()
        validate_ip_network(self.start_address)
        validate_ip_network(self.end_address)
        
        # Calculate and set size
        self.size = calculate_ip_range_size(self.start_address, self.end_address)
    
    def get_available_ips(self) -> List[str]:
        """Return all available IPs within this range."""
        return get_available_ips(f"{self.start_address}-{self.end_address}")
    
    def get_first_available_ip(self) -> Optional[str]:
        """Return the first available IP within the range."""
        available = self.get_available_ips()
        return available[0] if available else None
    
    def get_utilization(self) -> float:
        """Calculate range utilization percentage."""
        return calculate_prefix_utilization(f"{self.start_address}-{self.end_address}")
