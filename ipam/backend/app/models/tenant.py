from typing import Optional, List, TYPE_CHECKING
from sqlmodel import Field, Relationship
from .base import BaseModel

if TYPE_CHECKING:
    from .vrf import VRF
    from .ip_prefix import Prefix
    from .ip_prefix import IPRange
    from .site import Site
    from .vlan import VLAN
    from .aggregate import Aggregate
    from .device import Device
    from .ip_address import IPAddress

class Tenant(BaseModel, table=True):
    """
    A Tenant represents an organization or customer that can own or manage various network resources.
    """
    __tablename__ = "tenants"
    __table_args__ = {"schema": "ipam"}
    
    # Basic fields
    name: str = Field(..., description="Name of the tenant")
    slug: str = Field(..., description="URL-friendly name")
    description: Optional[str] = Field(default=None, description="Brief description")
    comments: Optional[str] = Field(default=None, description="Detailed comments")
    
    # Relationships
    vrfs: List["VRF"] = Relationship(back_populates="tenant")
    prefixes: List["Prefix"] = Relationship(back_populates="tenant")
    ip_ranges: List["IPRange"] = Relationship(back_populates="tenant")
    sites: List["Site"] = Relationship(back_populates="tenant")
    vlans: List["VLAN"] = Relationship(back_populates="tenant")
    aggregates: List["Aggregate"] = Relationship(back_populates="tenant")
    devices: List["Device"] = Relationship(
        back_populates="tenant",
        sa_relationship_kwargs={"primaryjoin": "Tenant.id == Device.tenant_id"}
    )
    ip_addresses: List["IPAddress"] = Relationship(back_populates="tenant")
    
    class Config:
        arbitrary_types_allowed = True
