from enum import Enum
from typing import Optional, List, TYPE_CHECKING
import sqlalchemy as sa
from sqlmodel import Field, Relationship
from .base import BaseModel

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
    A VLAN group is an arbitrary collection of VLANs within which VLAN IDs and names must be unique.
    """
    __tablename__ = "vlan_groups"
    __table_args__ = {"schema": "ipam"}
    
    # Basic fields
    name: str = Field(..., description="Name of the VLAN group")
    slug: str = Field(..., description="URL-friendly name")
    description: Optional[str] = Field(default=None, description="Brief description")
    
    # Fields specific to VLANGroup
    min_vid: int = Field(
        default=1,
        ge=1,
        le=4094,
        description="Lowest permissible ID of a child VLAN"
    )
    max_vid: int = Field(
        default=4094,
        ge=1,
        le=4094,
        description="Highest permissible ID of a child VLAN"
    )
    vlan_id_ranges: Optional[str] = Field(
        default=None,
        description="VLAN ID ranges in format like '1-20,60-90'"
    )
    
    # Relationships
    vlans: List["VLAN"] = Relationship(back_populates="group")
    
    def clean(self) -> None:
        """Validate the VLANGroup."""
        super().clean()
        if self.max_vid < self.min_vid:
            raise ValueError(
                f"Maximum VID ({self.max_vid}) cannot be less than minimum VID ({self.min_vid})"
            )

    class Config:
        arbitrary_types_allowed = True


class VLAN(BaseModel, table=True):
    """
    A VLAN is a distinct layer two forwarding domain identified by a 12-bit integer (1-4094).
    Each VLAN must be assigned to a Site, however VLAN IDs need not be unique within a Site.
    A VLAN may optionally be assigned to a VLANGroup, within which all VLAN IDs and names must be unique.
    """
    __tablename__ = "vlans"
    
    # Basic fields
    name: str = Field(..., description="Name of the VLAN")
    slug: str = Field(..., description="URL-friendly name")
    description: Optional[str] = Field(default=None, description="Brief description")
    
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
    tenant_id: Optional[int] = Field(default=None, foreign_key="ipam.tenants.id")
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
    tenant: Optional["Tenant"] = Relationship(back_populates="vlans")
    site: Optional["Site"] = Relationship(back_populates="vlans")
    group: Optional[VLANGroup] = Relationship(back_populates="vlans")
    role: Optional["Role"] = Relationship(back_populates="vlans")
    prefixes: List["Prefix"] = Relationship(back_populates="vlan")
    
    class Config:
        arbitrary_types_allowed = True
