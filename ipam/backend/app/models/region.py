from typing import Optional, List, TYPE_CHECKING
from sqlmodel import Field, Relationship
from .base import BaseModel

if TYPE_CHECKING:
    from .site import Site

class Region(BaseModel, table=True):
    """
    A Region represents a geographic region in which Sites reside.
    """
    __tablename__ = "regions"
    
    # Basic fields
    name: str = Field(..., description="Name of the region")
    slug: str = Field(..., description="URL-friendly name")
    description: Optional[str] = Field(default=None, description="Brief description")
    
    # Relationships
    sites: List["Site"] = Relationship(back_populates="region")
    
    class Config:
        arbitrary_types_allowed = True
