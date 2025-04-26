from typing import Optional, List, TYPE_CHECKING, ClassVar
import uuid
from sqlmodel import Field, Relationship
from .base import BaseModel
import sqlalchemy as sa

if TYPE_CHECKING:
    from .site import Site

class Region(BaseModel, table=True):
    """
    A Region represents a geographic region in which Sites reside.
    """
    __tablename__: ClassVar[str] = "regions"
    
    # Basic fields
    name: str = Field(..., description="Name of the region")
    slug: Optional[str] = Field(default=None, description="URL-friendly name")
    description: Optional[str] = Field(default=None, description="Brief description")

    __table_args__ = (
        sa.UniqueConstraint('name', name='uq_region_name'),
        {"schema": "ipam"},
    )
    
    # Foreign Keys
    parent_id: Optional[uuid.UUID] = Field(default=None, foreign_key="ipam.regions.id")
    
    # Relationships
    sites: List["Site"] = Relationship(back_populates="region")
    parent: Optional["Region"] = Relationship(back_populates="children", sa_relationship_kwargs={"remote_side": "Region.id"})
    children: List["Region"] = Relationship(back_populates="parent")
    
    class Config:
        arbitrary_types_allowed = True
