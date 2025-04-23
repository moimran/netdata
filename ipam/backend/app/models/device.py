from typing import Optional, List, TYPE_CHECKING
import sqlalchemy as sa
from sqlmodel import Field, Relationship
from .base import BaseModel

if TYPE_CHECKING:
    from .interface import Interface
    from .site import Site
    from .tenant import Tenant
    from .location import Location
    from .ip_address import IPAddress
    from .credential import Credential

class Device(BaseModel, table=True):
    """
    A Device represents a piece of physical hardware like a router, switch, or server.
    """
    __tablename__ = "devices"
    __table_args__ = (
        sa.UniqueConstraint('name', name='uq_device_name'),
        {"schema": "ipam"},
    )
    
    # Basic fields
    name: str = Field(..., description="Name of the device")
    description: Optional[str] = Field(default=None, description="Brief description")
    
    # Foreign Keys
    site_id: Optional[int] = Field(default=None, foreign_key="ipam.sites.id")
    tenant_id: Optional[int] = Field(default=None, foreign_key="ipam.tenants.id")
    location_id: Optional[int] = Field(default=None, foreign_key="ipam.locations.id")
    
    # Relationship with IPAddress
    ip_address_id: Optional[int] = Field(default=None, foreign_key="ipam.ip_addresses.id")
    
    # Credential relationships
    credential_name: Optional[str] = Field(default=None, foreign_key="ipam.credentials.name")
    fallback_credential_name: Optional[str] = Field(default=None, foreign_key="ipam.credentials.name")
    
    # Relationships
    site: Optional["Site"] = Relationship(back_populates="devices")
    tenant: Optional["Tenant"] = Relationship(back_populates="devices")
    location: Optional["Location"] = Relationship(back_populates="devices")
    interfaces: List["Interface"] = Relationship(back_populates="device")
    ip_address: Optional["IPAddress"] = Relationship()
    
    credential: Optional["Credential"] = Relationship(
        sa_relationship_kwargs={"foreign_keys": "[Device.credential_name]"}
    )
    fallback_credential: Optional["Credential"] = Relationship(
        sa_relationship_kwargs={"foreign_keys": "[Device.fallback_credential_name]"}
    )
    
    class Config:
        arbitrary_types_allowed = True
