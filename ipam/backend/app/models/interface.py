from typing import Optional, List, TYPE_CHECKING
import sqlalchemy as sa
from sqlmodel import SQLModel, Field, Relationship
from .base import BaseModel

if TYPE_CHECKING:
    from .ip_address import IPAddress
    from .device import Device

class Interface(BaseModel, table=True):
    """
    An Interface represents a network interface on a device.
    """
    __tablename__ = "interfaces"
    
    # Basic fields
    name: str = Field(..., description="Name of the interface")
    description: Optional[str] = Field(default=None, description="Brief description")
    
    # Foreign Keys
    device_id: Optional[int] = Field(default=None, foreign_key="devices.id")
    
    # Relationships
    device: Optional["Device"] = Relationship(back_populates="interfaces")
    ip_addresses: List["IPAddress"] = Relationship(back_populates="interface")
    
    class Config:
        arbitrary_types_allowed = True
