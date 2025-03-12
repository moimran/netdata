from typing import Optional, List, TYPE_CHECKING
import ipaddress
import sqlalchemy as sa
from sqlmodel import SQLModel, Field, Relationship, select
from .base import BaseModel, TimestampedModel
from .ip_constants import PrefixStatusEnum, IPRangeStatusEnum
from .fields import IPNetworkField
from .ip_utils import (
    validate_ip_network,
    calculate_ip_range_size,
    get_available_ips,
    calculate_prefix_utilization,
    is_subnet_of
)

if TYPE_CHECKING:
    from .site import Site
    from .vrf import VRF
    from .tenant import Tenant
    from .vlan import VLAN
    from .role import Role
    from .ip_address import IPAddress

class Prefix(TimestampedModel, table=True):
    """
    A Prefix represents an IPv4 or IPv6 network, including mask length. Prefixes can
    optionally be assigned to Sites and VRFs. A Prefix must be assigned a status and
    may optionally be assigned a user-defined Role. A Prefix can also be assigned to
    a VLAN where appropriate.
    """
    __tablename__ = "prefixes"
    
    # Primary key
    id: Optional[int] = Field(default=None, primary_key=True)
    
    # Basic fields
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
    
    # Hierarchical relationship fields
    parent_id: Optional[int] = Field(default=None, foreign_key="prefixes.id", index=True)
    
    # Foreign Keys
    site_id: Optional[int] = Field(default=None, foreign_key="sites.id")
    vrf_id: Optional[int] = Field(default=None, foreign_key="vrfs.id")
    tenant_id: Optional[int] = Field(default=None, foreign_key="tenants.id")
    vlan_id: Optional[int] = Field(default=None, foreign_key="vlans.id")
    role_id: Optional[int] = Field(default=None, foreign_key="roles.id")
    
    # Add a unique constraint for prefix within a VRF
    __table_args__ = (
        sa.UniqueConstraint('prefix', 'vrf_id', name='uq_prefix_vrf'),
    )
    
    # Relationships
    site: Optional["Site"] = Relationship(back_populates="prefixes")
    vrf: Optional["VRF"] = Relationship(back_populates="prefixes")
    tenant: Optional["Tenant"] = Relationship(back_populates="prefixes")
    vlan: Optional["VLAN"] = Relationship(back_populates="prefixes")
    role: Optional["Role"] = Relationship(back_populates="prefixes")
    ip_addresses: List["IPAddress"] = Relationship(back_populates="prefix")
    
    # Self-referential relationships
    parent: Optional["Prefix"] = Relationship(
        sa_relationship_kwargs={"remote_side": "Prefix.id", "back_populates": "children"}
    )
    children: List["Prefix"] = Relationship(
        sa_relationship_kwargs={"back_populates": "parent"}
    )
    
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
    
    def find_parent_prefix(self, session) -> Optional["Prefix"]:
        """
        Find the immediate parent prefix for this prefix.
        A parent prefix is one that contains this prefix and has the largest mask length.
        """
        try:
            # Convert this prefix to an IP network object
            this_network = ipaddress.ip_network(self.prefix)
            
            # Query for potential parent prefixes
            # They must have the same VRF (or both None)
            query = select(Prefix).where(
                (Prefix.id != self.id) &  # Exclude self
                ((Prefix.vrf_id == self.vrf_id) | 
                 ((Prefix.vrf_id == None) & (self.vrf_id == None)))
            )
            
            potential_parents = session.exec(query).all()
            
            # Find the smallest prefix that contains this one
            best_parent = None
            best_mask = -1  # Start with an invalid mask length
            
            for prefix in potential_parents:
                try:
                    parent_network = ipaddress.ip_network(prefix.prefix)
                    
                    # Skip if not the same IP version
                    if parent_network.version != this_network.version:
                        continue
                    
                    # Check if this prefix is a subnet of the potential parent
                    if this_network.subnet_of(parent_network) and this_network != parent_network:
                        # If we found a better (more specific) parent
                        if parent_network.prefixlen > best_mask:
                            best_parent = prefix
                            best_mask = parent_network.prefixlen
                except ValueError:
                    # Skip invalid networks
                    continue
            
            return best_parent
        except Exception as e:
            print(f"Error finding parent prefix: {str(e)}")
            return None
    
    def update_hierarchy(self, session) -> None:
        """
        Update the hierarchical relationships for this prefix.
        This includes finding the parent prefix and updating child counts.
        """
        # Find the parent prefix
        parent_prefix = self.find_parent_prefix(session)
        
        # If we found a parent and it's different from the current parent
        if parent_prefix and parent_prefix.id != self.parent_id:
            # Update the old parent's child count if there was one
            if self.parent_id:
                old_parent = session.get(Prefix, self.parent_id)
                if old_parent:
                    old_parent.child_count = max(0, old_parent.child_count - 1)
                    session.add(old_parent)
            
            # Set the new parent
            self.parent_id = parent_prefix.id
            self.depth = parent_prefix.depth + 1
            
            # Update the new parent's child count
            parent_prefix.child_count += 1
            session.add(parent_prefix)
        
        # If we didn't find a parent but had one before
        elif not parent_prefix and self.parent_id:
            # Update the old parent's child count
            old_parent = session.get(Prefix, self.parent_id)
            if old_parent:
                old_parent.child_count = max(0, old_parent.child_count - 1)
                session.add(old_parent)
            
            # Clear the parent
            self.parent_id = None
            self.depth = 0


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
    
    # Add a unique constraint for IP range within a VRF
    __table_args__ = (
        sa.UniqueConstraint('start_address', 'end_address', 'vrf_id', name='uq_iprange_vrf'),
    )
    
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
