from typing import Optional, TYPE_CHECKING
import sqlalchemy as sa
from sqlmodel import Field, Relationship
from .base import BaseModel

if TYPE_CHECKING:
    from .ip_address import IPAddress
    from .device import Device

class Interface(BaseModel, table=True):
    """
    An Interface represents a network interface on a device.
    """
    __tablename__ = "interfaces"
    __table_args__ = (
        sa.UniqueConstraint('name', name='uq_interface_name'),
        {"schema": "ipam"},
    )
    
    # Basic fields
    name: str = Field(..., description="Name of the interface")
    description: Optional[str] = Field(default=None, description="Brief description")
    
    # Foreign Keys
    device_id: int = Field(foreign_key="ipam.devices.id")
    ip_address_id: Optional[int] = Field(default=None, foreign_key="ipam.ip_addresses.id")
    
    # Relationships
    device: "Device" = Relationship(back_populates="interfaces")
    ip_address: Optional["IPAddress"] = Relationship(back_populates="interfaces")

    class Config:
        arbitrary_types_allowed = True
