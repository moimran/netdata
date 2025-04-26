from enum import Enum
from typing import Optional, List, TYPE_CHECKING, ClassVar
import sqlalchemy as sa
from sqlmodel import Field, Relationship, Session, select
from .base import BaseModel
import uuid

if TYPE_CHECKING:
    from .tenant import Tenant
    from .site import Site
    from .role import Role
    from .ip_prefix import Prefix

class VLANStatusEnum(str, Enum):
    ACTIVE = "active"
    RESERVED = "reserved"
    DEPRECATED = "deprecated"

class VLANGroup(BaseModel, table=True):
    """
    A VLAN group defines a range of available VLAN IDs for a site.
    VLANs can be allocated from this range.
    """
    __tablename__: ClassVar[str] = "vlan_groups"
    __table_args__: ClassVar[tuple] = ({"schema": "ipam"},)
    
    name: str = Field(..., description="Name of the VLAN group")
    min_vid: int = Field(..., description="Minimum VLAN ID in this group", ge=1, le=4094)
    max_vid: int = Field(..., description="Maximum VLAN ID in this group", ge=1, le=4094)
    description: Optional[str] = Field(default=None, description="Description of this VLAN group")
    
    # Foreign Keys
    site_id: Optional[uuid.UUID] = Field(default=None, foreign_key="ipam.sites.id")
    
    # Relationships
    site: Optional["Site"] = Relationship(back_populates="vlan_groups")
    vlans: List["VLAN"] = Relationship(back_populates="group")
    
    def _vlans_overlap(self, other: "VLANGroup") -> bool:
        """
        Check if this VLAN group's range overlaps with another group.
        
        An overlap occurs if any VID in this group's range falls within
        the other group's range.
        
        Args:
            other: Another VLANGroup instance to check against
            
        Returns:
            bool: True if the ranges overlap, False otherwise
        """
        # Check all possible overlap scenarios
        return (
            (self.min_vid <= other.min_vid <= self.max_vid) or   # other min within this range
            (self.min_vid <= other.max_vid <= self.max_vid) or   # other max within this range
            (other.min_vid <= self.min_vid <= other.max_vid) or  # this min within other range
            (other.min_vid <= self.max_vid <= other.max_vid)     # this max within other range
        )
    
    def validate(self, session: Session) -> None:
        """
        Validate the VLANGroup:
        1. Ensure min_vid is less than or equal to max_vid
        2. Check for overlaps with existing VLAN groups in same site
        
        Args:
            session: SQLAlchemy session for querying existing groups
            
        Raises:
            ValueError: If validation fails
        """
        # First validate the VID range itself
        if self.max_vid < self.min_vid:
            raise ValueError(
                f"Maximum VID ({self.max_vid}) cannot be less than minimum VID ({self.min_vid})"
            )
        
        # Only check for overlaps if we have a site
        if self.site_id is not None:
            # Get the table columns for the query
            vlan_group = VLANGroup.__table__
            
            # Query for existing VLAN groups at the same site
            stmt = select(VLANGroup).where(
                vlan_group.c.id != self.id,  # Exclude self when updating
                vlan_group.c.site_id == self.site_id  # Same site
            )
            
            # Execute the query
            result = session.execute(stmt)
            existing_groups = result.scalars().all()
            
            # Check for overlaps with each existing group
            for existing in existing_groups:
                if self._vlans_overlap(existing):
                    raise ValueError(
                        f"VLAN range {self.min_vid}-{self.max_vid} overlaps with "
                        f"existing group {existing.min_vid}-{existing.max_vid} at site {self.site_id}"
                    )

    class Config:
        arbitrary_types_allowed = True


class VLAN(BaseModel, table=True):
    """
    A VLAN is a distinct layer two forwarding domain identified by a 12-bit integer (1-4094).
    Each VLAN must be assigned to a Site, however VLAN IDs need not be unique within a Site.
    A VLAN may optionally be assigned to a VLANGroup, within which all VLAN IDs and names must be unique.
    """
    __tablename__: ClassVar[str] = "vlans"
    
    # Basic fields
    name: str = Field(..., description="Name of the VLAN")
    slug: str = Field(..., description="URL-friendly name")
    
    # VLAN specific fields
    vid: int = Field(
        ...,
        ge=1,
        le=4094,
        description="VLAN ID (1-4094)"
    )
    status: VLANStatusEnum = Field(
        default=VLANStatusEnum.ACTIVE,
        description="Operational status"
    )
    
    # Foreign Keys
    tenant_id: uuid.UUID = Field(..., foreign_key="ipam.tenants.id", description="Tenant this VLAN belongs to")
    site_id: Optional[int] = Field(default=None, foreign_key="ipam.sites.id")
    group_id: Optional[int] = Field(default=None, foreign_key="ipam.vlan_groups.id")
    role_id: Optional[int] = Field(default=None, foreign_key="ipam.roles.id")
    
    # Add a unique constraint for VLAN ID within a site or group
    __table_args__ = (
        sa.UniqueConstraint('vid', 'site_id', name='uq_vlan_vid_site'),
        sa.UniqueConstraint('vid', 'group_id', name='uq_vlan_vid_group'),
        sa.UniqueConstraint('name', 'site_id', name='uq_vlan_name_site'),
        sa.UniqueConstraint('name', 'group_id', name='uq_vlan_name_group'),
        {"schema": "ipam"}
    )
    
    # Relationships
    tenant: "Tenant" = Relationship(back_populates="vlans")
    site: Optional["Site"] = Relationship(back_populates="vlans")
    group: Optional[VLANGroup] = Relationship(back_populates="vlans")
    role: Optional["Role"] = Relationship(back_populates="vlans")
    prefixes: List["Prefix"] = Relationship(back_populates="vlan")
    
    class Config:
        arbitrary_types_allowed = True
