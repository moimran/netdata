from typing import Optional, List, TYPE_CHECKING
from sqlmodel import Field, Relationship
from .base import BaseModel

if TYPE_CHECKING:
    from .site import Site

class SiteGroup(BaseModel, table=True):
    """
    A SiteGroup represents a logical grouping of Sites.
    """
    __tablename__ = "site_groups"
    
    # Basic fields
    name: str = Field(..., description="Name of the site group")
    slug: Optional[str] = Field(default=None, description="URL-friendly name")
    description: Optional[str] = Field(default=None, description="Brief description")
    
    # Relationships
    sites: List["Site"] = Relationship(back_populates="site_group")
    
    class Config:
        arbitrary_types_allowed = True
