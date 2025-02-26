from datetime import date
from typing import Optional, List, TYPE_CHECKING
from sqlmodel import SQLModel, Field, Relationship
from .base import BaseModel
from .ip_constants import *
from .fields import IPNetworkField
from .ip_utils import calculate_prefix_utilization

# Import models instead of redefining them
from .rir import RIR
from .aggregate import Aggregate
if TYPE_CHECKING:
    from .tenant import Tenant
    from .location import Location

class Device(BaseModel, table=True):
    """
    A device represents a piece of physical or virtual equipment that hosts interfaces.
    """
    __tablename__ = "devices"
    
    # Basic fields
    name: str = Field(..., description="Name of the device")
    description: Optional[str] = Field(default=None, description="Brief description")
    
    # Foreign Keys
    location_id: Optional[int] = Field(default=None, foreign_key="locations.id")
    
    # Relationships
    interfaces: List["Interface"] = Relationship(back_populates="device")
    location: Optional["Location"] = Relationship(back_populates="devices")
    
    class Config:
        arbitrary_types_allowed = True


class Interface(BaseModel, table=True):
    """
    An interface represents a network interface on a device.
    """
    __tablename__ = "interfaces"
    
    # Basic fields
    name: str = Field(..., description="Name of the interface")
    description: Optional[str] = Field(default=None, description="Brief description")
    
    # Foreign Keys
    device_id: Optional[int] = Field(default=None, foreign_key="devices.id")
    
    # Relationships
    device: Optional[Device] = Relationship(back_populates="interfaces")
    
    class Config:
        arbitrary_types_allowed = True
