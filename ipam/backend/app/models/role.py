from typing import Optional, List, TYPE_CHECKING
from sqlmodel import SQLModel, Field, Relationship
from .base import BaseModel

if TYPE_CHECKING:
    from .vlan import VLAN
    from .ip_prefix import Prefix

class Role(BaseModel, table=True):
    """
    Functional role for prefixes, VLANs, etc.
    """
    __tablename__ = "roles"
    
    # Basic fields
    name: str = Field(..., description="Name of the role")
    slug: str = Field(..., description="URL-friendly name")
    description: Optional[str] = Field(default=None, description="Brief description")
    
    # Color for UI representation
    color: str = Field(
        default="808080",
        max_length=6,
        description="RGB color in hexadecimal (e.g. 00ff00)"
    )
    
    # Relationships
    vlans: List["VLAN"] = Relationship(back_populates="role")
    prefixes: List["Prefix"] = Relationship(back_populates="role")
    
    class Config:
        arbitrary_types_allowed = True
