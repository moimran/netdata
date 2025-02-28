from typing import Optional, List, TYPE_CHECKING
import sqlalchemy as sa
from sqlmodel import SQLModel, Field, Relationship
from .base import BaseModel

if TYPE_CHECKING:
    from .interface import Interface
    from .site import Site
    from .tenant import Tenant
    from .location import Location

class Device(BaseModel, table=True):
    """
    A Device represents a piece of physical hardware like a router, switch, or server.
    """
    __tablename__ = "devices"
    
    # Basic fields
    name: str = Field(..., description="Name of the device")
    description: Optional[str] = Field(default=None, description="Brief description")
    
    # Foreign Keys
    site_id: Optional[int] = Field(default=None, foreign_key="sites.id")
    tenant_id: Optional[int] = Field(default=None, foreign_key="tenants.id")
    location_id: Optional[int] = Field(default=None, foreign_key="locations.id")
    
    # Relationships
    site: Optional["Site"] = Relationship(back_populates="devices")
    tenant: Optional["Tenant"] = Relationship(back_populates="devices")
    location: Optional["Location"] = Relationship(back_populates="devices")
    interfaces: List["Interface"] = Relationship(back_populates="device")
    
    class Config:
        arbitrary_types_allowed = True
