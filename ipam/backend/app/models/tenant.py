from typing import Optional, List, TYPE_CHECKING, ClassVar
import uuid
from sqlmodel import Field, Relationship
from sqlalchemy import Column, String, Table
from .base import BaseModel

if TYPE_CHECKING:
    from .vrf import VRF
    from .ip_prefix import Prefix
    from .ip_prefix import IPRange
    from .site import Site
    from .vlan import VLAN
    from .aggregate import Aggregate
    from .deviceinventory import DeviceInventory
    from .ip_address import IPAddress
    from .user import User
    from .site_group import SiteGroup
    from .rir import RIR
    from .asn import ASN, ASNRange
    from .role import Role

class Tenant(BaseModel, table=True):
    """
    A Tenant represents an organization or customer that can own or manage various network resources.
    """
    # Use ClassVar to avoid type checking issues
    __tablename__: ClassVar[str] = "tenants"
    __table_args__: ClassVar[dict] = {"schema": "ipam"}
    
    # Basic fields
    name: str = Field(..., description="Name of the tenant")
    slug: str = Field(..., description="URL-friendly name")
    
    # Reference fields
    parent_tenant_id: Optional[uuid.UUID] = Field(default=None, foreign_key="ipam.tenants.id")
    
    # Relationships
    vrfs: List["VRF"] = Relationship(back_populates="tenant")
    prefixes: List["Prefix"] = Relationship(back_populates="tenant")
    ip_ranges: List["IPRange"] = Relationship(back_populates="tenant")
    sites: List["Site"] = Relationship(back_populates="tenant")
    vlans: List["VLAN"] = Relationship(back_populates="tenant")
    aggregates: List["Aggregate"] = Relationship(back_populates="tenant")
    device_inventories: List["DeviceInventory"] = Relationship(
        back_populates="tenant",
        sa_relationship_kwargs={"primaryjoin": "Tenant.id == DeviceInventory.tenant_id"}
    )
    ip_addresses: List["IPAddress"] = Relationship(back_populates="tenant")
    users: List["User"] = Relationship(back_populates="tenant")
    site_groups: List["SiteGroup"] = Relationship(back_populates="tenant")
    rirs: List["RIR"] = Relationship(back_populates="tenant")
    asns: List["ASN"] = Relationship(back_populates="tenant")
    asn_ranges: List["ASNRange"] = Relationship(back_populates="tenant")
    roles: List["Role"] = Relationship(back_populates="tenant")
    
    class Config:
        arbitrary_types_allowed = True
