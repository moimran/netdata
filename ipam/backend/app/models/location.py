from typing import Optional, List, TYPE_CHECKING
from sqlmodel import Field, Relationship
from .base import BaseModel

if TYPE_CHECKING:
    from .site import Site
    from .device import Device

class Location(BaseModel, table=True):
    """
    A Location represents a specific area within a Site, such as a room, rack, etc.
    """
    __tablename__ = "locations"
    
    # Basic fields
    name: str = Field(..., description="Name of the location")
    slug: str = Field(..., description="URL-friendly name")
    description: Optional[str] = Field(default=None, description="Brief description")
    status: str = Field(default="active", description="Operational status")
    
    # Foreign Keys
    site_id: Optional[int] = Field(default=None, foreign_key="sites.id")
    parent_id: Optional[int] = Field(default=None, foreign_key="locations.id")
    
    # Relationships
    site: Optional["Site"] = Relationship(back_populates="locations")
    parent: Optional["Location"] = Relationship(back_populates="children", sa_relationship_kwargs={"remote_side": "Location.id"})
    children: List["Location"] = Relationship(back_populates="parent")
    devices: List["Device"] = Relationship(back_populates="location")
    
    class Config:
        arbitrary_types_allowed = True
