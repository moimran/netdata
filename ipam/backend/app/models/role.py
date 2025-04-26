from typing import Optional, List, TYPE_CHECKING, ClassVar
import uuid
from sqlmodel import Field, Relationship
from .base import BaseModel

if TYPE_CHECKING:
    from .vlan import VLAN
    from .ip_prefix import Prefix
    from .tenant import Tenant

class Role(BaseModel, table=True):
    """
    Functional role for prefixes, VLANs, etc. Each tenant can define their own roles
    to match their specific network classification needs.
    """
    __tablename__: ClassVar[str] = "roles"
    __table_args__ = {"schema": "ipam"}
    
    # Basic fields
    name: str = Field(..., description="Name of the role")
    slug: str = Field(..., description="URL-friendly name")
    
    # Color for UI representation
    color: str = Field(
        default="808080",
        max_length=6,
        description="RGB color in hexadecimal (e.g. 00ff00)"
    )
    
    # Foreign Keys
    tenant_id: uuid.UUID = Field(..., foreign_key="ipam.tenants.id", description="Tenant this role belongs to")
    
    # Relationships
    tenant: "Tenant" = Relationship(back_populates="roles")
    vlans: List["VLAN"] = Relationship(back_populates="role")
    prefixes: List["Prefix"] = Relationship(back_populates="role")
    
    class Config:
        arbitrary_types_allowed = True
