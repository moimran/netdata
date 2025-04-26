from typing import Optional, List, TYPE_CHECKING, ClassVar
import uuid
from sqlmodel import Field, Relationship
from .base import BaseModel

if TYPE_CHECKING:
    from .site import Site
    from .tenant import Tenant

class SiteGroup(BaseModel, table=True):
    """
    A SiteGroup represents a logical grouping of Sites within a tenant.
    """
    __tablename__: ClassVar[str] = "site_groups"
    __table_args__ = {"schema": "ipam"}
    
    # Basic fields
    name: str = Field(..., description="Name of the site group")
    slug: Optional[str] = Field(default=None, description="URL-friendly name")
    description: Optional[str] = Field(default=None, description="Brief description")
    
    # Foreign Keys
    tenant_id: uuid.UUID = Field(..., foreign_key="ipam.tenants.id", description="Tenant this site group belongs to")
    
    # Relationships
    tenant: "Tenant" = Relationship(back_populates="site_groups")
    sites: List["Site"] = Relationship(back_populates="site_group")
    
    class Config:
        arbitrary_types_allowed = True
