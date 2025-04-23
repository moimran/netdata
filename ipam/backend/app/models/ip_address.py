from typing import Optional, List, TYPE_CHECKING
import sqlalchemy as sa
from sqlmodel import Field, Relationship
from .base import BaseModel
from .ip_constants import IPAddressStatusEnum, IPAddressRoleEnum
from .fields import IPNetworkField
from .ip_utils import validate_ip_address

if TYPE_CHECKING:
    from .prefix import Prefix
    from .interface import Interface
    from .vrf import VRF
    from .tenant import Tenant

class IPAddress(BaseModel, table=True):
    """
    An IPAddress represents an IP address and its mask, and may optionally be assigned to
    an Interface. An IPAddress can also be assigned to a VRF. An IPAddress must be assigned
    a status and may optionally be assigned a user-defined Role.
    """
    __tablename__ = "ip_addresses"
    
    # Override name and slug from BaseModel to make them optional
    name: Optional[str] = Field(default="", description="Name of the IP address")
    slug: Optional[str] = Field(default="", description="URL-friendly name")
    
    # Basic fields
    description: Optional[str] = Field(default=None, description="Brief description")
    
    # Fields specific to IPAddress
    address: str = IPNetworkField(
        description="IPv4 or IPv6 address with mask",
        index=True
    )
    status: IPAddressStatusEnum = Field(
        default=IPAddressStatusEnum.ACTIVE,
        description="Operational status of this IP address"
    )
    role: Optional[IPAddressRoleEnum] = Field(
        default=None,
        description="The functional role of this IP address"
    )
    dns_name: Optional[str] = Field(
        default=None,
        description="DNS name for this IP address"
    )
    
    # Add a unique constraint for IP address within a VRF
    __table_args__ = (
        sa.UniqueConstraint('address', 'vrf_id', name='uq_ipaddress_vrf'),
        {"schema": "ipam"},
    )
    
    # Foreign Keys
    prefix_id: Optional[int] = Field(default=None, foreign_key="ipam.prefixes.id")
    vrf_id: Optional[int] = Field(default=None, foreign_key="ipam.vrfs.id")
    tenant_id: Optional[int] = Field(default=None, foreign_key="ipam.tenants.id")
    
    # Relationships
    prefix: Optional["Prefix"] = Relationship(back_populates="ip_addresses")
    vrf: Optional["VRF"] = Relationship(back_populates="ip_addresses")
    tenant: Optional["Tenant"] = Relationship(back_populates="ip_addresses")
    interfaces: List["Interface"] = Relationship(back_populates="ip_address")
    
    class Config:
        arbitrary_types_allowed = True
    
    def clean(self) -> None:
        """Validate the IP address."""
        super().clean()
        is_valid, error = validate_ip_address(self.address)
        if not is_valid:
            raise ValueError(f"Invalid IP address: {error}")
