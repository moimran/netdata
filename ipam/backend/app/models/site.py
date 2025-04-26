from typing import Optional, List, TYPE_CHECKING, ClassVar
import uuid
from sqlmodel import Field, Relationship
from .base import BaseModel

if TYPE_CHECKING:
    from .tenant import Tenant
    from .vlan import VLAN
    from .ip_prefix import Prefix
    from .region import Region
    from .site_group import SiteGroup
    from .location import Location
    from .deviceinventory import DeviceInventory

class Site(BaseModel, table=True):
    """
    A Site represents a physical location where devices and networks are located.
    """
    __tablename__: ClassVar[str] = "sites"
    __table_args__ = {"schema": "ipam"}
    
    # Basic fields
    name: str = Field(..., description="Name of the site")
    slug: Optional[str] = Field(default=None, description="URL-friendly name")
    description: Optional[str] = Field(default=None, description="Brief description")
    
    # Physical location attributes
    facility: Optional[str] = Field(default=None, description="Data center/facility name")
    physical_address: Optional[str] = Field(default=None, description="Physical address of the site")
    
    # Status and contact info
    status: str = Field(default="active")
    
    # Foreign Keys
    tenant_id: uuid.UUID = Field(..., foreign_key="ipam.tenants.id", description="Tenant this site belongs to")
    region_id: Optional[uuid.UUID] = Field(default=None, foreign_key="ipam.regions.id")
    site_group_id: Optional[uuid.UUID] = Field(default=None, foreign_key="ipam.site_groups.id")
    
    # Relationships
    tenant: "Tenant" = Relationship(back_populates="sites")
    region: Optional["Region"] = Relationship(back_populates="sites")
    site_group: Optional["SiteGroup"] = Relationship(back_populates="sites")
    vlans: List["VLAN"] = Relationship(back_populates="site")
    prefixes: List["Prefix"] = Relationship(back_populates="site")
    locations: List["Location"] = Relationship(back_populates="site")
    devices: List["DeviceInventory"] = Relationship(
        back_populates="site",
        sa_relationship_kwargs={"primaryjoin": "Site.id == DeviceInventory.site_id"}
    )
    
    class Config:
        arbitrary_types_allowed = True
