from typing import Optional, TYPE_CHECKING, ClassVar
import uuid
import sqlalchemy as sa
from sqlmodel import Field, Relationship
from .base import BaseModel

if TYPE_CHECKING:
    from .ip_address import IPAddress
    from .deviceinventory import DeviceInventory

class Interface(BaseModel, table=True):
    """
    An Interface represents a network interface on a device.
    """
    __tablename__: ClassVar[str] = "interfaces"
    __table_args__: ClassVar[tuple] = (
        sa.UniqueConstraint('name', name='uq_interface_name'),
        {"schema": "ipam"}
    )
    
    # Basic fields
    name: str = Field(..., description="Name of the interface")
    description: Optional[str] = Field(default=None, description="Brief description")
    
    # Foreign Keys
    device_uuid: uuid.UUID = Field(foreign_key="ni.device_inventory.device_uuid")
    ip_address_id: Optional[uuid.UUID] = Field(default=None, foreign_key="ipam.ip_addresses.id")
    
    # Relationships
    device: "DeviceInventory" = Relationship(back_populates="interfaces")
    ip_address: Optional["IPAddress"] = Relationship(back_populates="interfaces")

    class Config:
        arbitrary_types_allowed = True
