from typing import Optional, List, TYPE_CHECKING, ClassVar, Union, Tuple
import uuid
import ipaddress
from ipaddress import IPv4Network, IPv6Network
import sqlalchemy as sa
from sqlmodel import Field, Relationship, select, Session
from sqlalchemy.sql.elements import BooleanClauseList
from sqlalchemy.sql.expression import and_, or_
from .base import BaseModel
from .ip_constants import PrefixStatusEnum, IPRangeStatusEnum
from .fields import IPNetworkType
from .ip_utils import (
    validate_ip_network,
    calculate_ip_range_size,
    get_available_ips,
    calculate_prefix_utilization,
)

if TYPE_CHECKING:
    from .site import Site
    from .vrf import VRF
    from .tenant import Tenant
    from .vlan import VLAN
    from .role import Role
    from .ip_address import IPAddress

class Prefix(BaseModel, table=True):
    """
    A Prefix represents an IPv4 or IPv6 network, including mask length. Prefixes can
    optionally be assigned to Sites and VRFs. A Prefix must be assigned a status and
    may optionally be assigned a user-defined Role. A Prefix can also be assigned to
    a VLAN where appropriate.
    """
    __tablename__: ClassVar[str] = "prefixes"
    __table_args__: ClassVar[tuple] = (
        sa.UniqueConstraint('prefix', 'vrf_id', name='uq_prefix_vrf'),
        {"schema": "ipam"},
    )
    
    # Fields specific to Prefix
    prefix: str = Field(
        ...,
        description="IPv4 or IPv6 network with mask",
        sa_column=sa.Column(IPNetworkType, index=True)
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
    parent_id: Optional[uuid.UUID] = Field(default=None, foreign_key="ipam.prefixes.id", index=True)
    
    # Foreign Keys
    site_id: Optional[uuid.UUID] = Field(default=None, foreign_key="ipam.sites.id")
    vrf_id: Optional[uuid.UUID] = Field(default=None, foreign_key="ipam.vrfs.id")
    tenant_id: uuid.UUID = Field(..., foreign_key="ipam.tenants.id", description="Tenant this prefix belongs to")
    vlan_id: Optional[uuid.UUID] = Field(default=None, foreign_key="ipam.vlans.id")
    role_id: Optional[uuid.UUID] = Field(default=None, foreign_key="ipam.roles.id")
    
    # Relationships
    site: Optional["Site"] = Relationship(back_populates="prefixes")
    vrf: Optional["VRF"] = Relationship(back_populates="prefixes")
    tenant: "Tenant" = Relationship(back_populates="prefixes")
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
    
    def validate(self) -> None:
        """Validate the prefix."""
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
                 ((Prefix.vrf_id is None) & (self.vrf_id is None)))
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
                    # Handle IPv4 and IPv6 networks separately
                    if (
                        (isinstance(this_network, IPv4Network) and isinstance(parent_network, IPv4Network) and this_network.subnet_of(parent_network)) or
                        (isinstance(this_network, IPv6Network) and isinstance(parent_network, IPv6Network) and this_network.subnet_of(parent_network))
                    ) and this_network != parent_network:
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
    Ranges must not overlap with other ranges within the same VRF and tenant.
    """
    __tablename__: ClassVar[str] = "ip_ranges"
    __table_args__: ClassVar[tuple] = (
        sa.UniqueConstraint('start_address', 'end_address', 'vrf_id', name='uq_iprange_vrf'),
        {"schema": "ipam"}
    )
    
    # Fields specific to IPRange
    start_address: str = Field(
        ...,
        description="IPv4 or IPv6 start address",
        sa_column=sa.Column(IPNetworkType, index=True)
    )
    end_address: str = Field(
        ...,
        description="IPv4 or IPv6 end address",
        sa_column=sa.Column(IPNetworkType, index=True)
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
    vrf_id: Optional[uuid.UUID] = Field(default=None, foreign_key="ipam.vrfs.id")
    tenant_id: uuid.UUID = Field(..., foreign_key="ipam.tenants.id", description="Tenant this IP range belongs to")
    
    # Relationships
    vrf: Optional["VRF"] = Relationship(back_populates="ip_ranges")
    tenant: "Tenant" = Relationship(back_populates="ip_ranges")
    
    class Config:
        arbitrary_types_allowed = True

    def _ranges_overlap(self, other: "IPRange") -> bool:
        """
        Check if this range overlaps with another range.
        
        This method implements a comprehensive overlap check between two IP ranges.
        An overlap occurs in any of these scenarios:
        1. One range's start address falls within the other range
        2. One range's end address falls within the other range
        3. One range completely contains the other range
        
        Args:
            other: Another IPRange instance to check against this one
            
        Returns:
            bool: True if the ranges overlap, False otherwise
            
        Note:
            - This check is commutative: a.overlaps(b) == b.overlaps(a)
            - Ranges in different VRFs are considered non-overlapping
            - Different IP versions (IPv4/IPv6) never overlap
        """
        try:
            # Convert addresses to IP objects for comparison
            this_start = ipaddress.ip_address(self.start_address)
            this_end = ipaddress.ip_address(self.end_address)
            other_start = ipaddress.ip_address(other.start_address)
            other_end = ipaddress.ip_address(other.end_address)
            
            # If different IP versions, they can't overlap
            if this_start.version != other_start.version:
                return False
                
            # Convert to integers for comparison
            # This avoids type issues with IPv4Address/IPv6Address comparisons
            this_start_int = int(this_start)
            this_end_int = int(this_end)
            other_start_int = int(other_start)
            other_end_int = int(other_end)
            
            # Check all possible overlap scenarios using integer comparisons
            return (
                (this_start_int <= other_start_int <= this_end_int) or   # other start within this range
                (this_start_int <= other_end_int <= this_end_int) or     # other end within this range
                (other_start_int <= this_start_int <= other_end_int) or  # this start within other range
                (other_start_int <= this_end_int <= other_end_int)       # this end within other range
            )
        except ValueError:
            # If we can't parse the addresses, assume no overlap
            return False
    
    def validate(self, session: Session) -> None:
        """
        Validate the IP range:
        1. Ensure start address is less than end address
        2. Ensure start and end are same IP version
        3. Check for overlaps with existing ranges in same VRF and tenant
        
        Args:
            session: SQLAlchemy session for querying existing ranges
            
        Raises:
            ValueError: If validation fails
        """
        try:
            # Convert addresses to IP objects
            start_ip = ipaddress.ip_address(self.start_address)
            end_ip = ipaddress.ip_address(self.end_address)
            
            # Ensure same IP version
            if start_ip.version != end_ip.version:
                raise ValueError("Start and end addresses must be the same IP version")
            
            # Convert to integers for comparison
            start_int = int(start_ip)
            end_int = int(end_ip)
            
            # Ensure start <= end
            if start_int > end_int:
                raise ValueError(f"Start address {self.start_address} must be less than or equal to end address {self.end_address}")
            
            # Calculate and store size
            self.size = end_int - start_int + 1
            
            # Query for existing ranges within the same VRF and tenant
            overlapping_ranges = []
            
            # Get ranges with matching VRF
            if self.vrf_id is not None:
                matching_vrf_ranges = session.exec(
                    select(IPRange).where(
                        IPRange.id != self.id,  # Exclude self when updating
                        IPRange.tenant_id == self.tenant_id,  # Same tenant
                        IPRange.vrf_id == self.vrf_id  # Same VRF
                    )
                ).all()
                overlapping_ranges += matching_vrf_ranges
            
            # Get ranges with no VRF if this range has no VRF
            if self.vrf_id is None:
                no_vrf_ranges = session.exec(
                    select(IPRange).where(
                        IPRange.id != self.id,  # Exclude self when updating
                        IPRange.tenant_id == self.tenant_id,  # Same tenant
                        IPRange.vrf_id == None  # No VRF
                    )
                ).all()
                overlapping_ranges += no_vrf_ranges
            
            # Check for overlaps with each existing range
            for existing in overlapping_ranges:
                if self._ranges_overlap(existing):
                    raise ValueError(
                        f"IP range {self.start_address}-{self.end_address} overlaps with "
                        f"existing range {existing.start_address}-{existing.end_address}"
                    )
            
        except ValueError as e:
            raise ValueError(f"Invalid IP range: {str(e)}")
        except Exception as e:
            raise ValueError(f"Error validating IP range: {str(e)}")
    
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
