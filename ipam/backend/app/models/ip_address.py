from typing import Optional, List, TYPE_CHECKING, ClassVar
import uuid
import sqlalchemy as sa
from sqlmodel import Field, Relationship
from .base import BaseModel
from .ip_constants import IPAddressStatusEnum, IPAddressRoleEnum
from .ip_utils import validate_ip_address
from .ip_prefix import IPNetworkType
if TYPE_CHECKING:
    from .ip_prefix import Prefix
    from .vrf import VRF
    from .tenant import Tenant

class IPAddress(BaseModel, table=True):
    """
    An IPAddress represents an IP address and its mask, and may optionally be assigned to
    an Interface. An IPAddress can also be assigned to a VRF. An IPAddress must be assigned
    a status and may optionally be assigned a user-defined Role.
    """
    __tablename__: ClassVar[str] = "ip_addresses"
    __table_args__: ClassVar[tuple] = (
        sa.UniqueConstraint('ipv4_address', 'vrf_id', name='uq_ipaddress_vrf'),
        {"schema": "ipam"},
    )   
    # Fields specific to IPAddress
    ipv4_address: str = Field(
        ...,
        description="IPv4 or IPv6 address with mask",
        sa_column=sa.Column(IPNetworkType, index=True)
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
    
    # Foreign Keys
    prefix_id: Optional[uuid.UUID] = Field(default=None, foreign_key="ipam.prefixes.id")
    vrf_id: Optional[uuid.UUID] = Field(default=None, foreign_key="ipam.vrfs.id")
    tenant_id: uuid.UUID = Field(..., foreign_key="ipam.tenants.id", description="Tenant this IP address belongs to")
    
    # Relationships
    prefix: Optional["Prefix"] = Relationship(back_populates="ip_addresses")
    vrf: Optional["VRF"] = Relationship(back_populates="ip_addresses")
    tenant: "Tenant" = Relationship(back_populates="ip_addresses")
    
    class Config:
        arbitrary_types_allowed = True
    
    def validate(self) -> None:
        """Validate the IP address."""
        is_valid, error = validate_ip_address(self.ipv4_address)
        if not is_valid:
            raise ValueError(f"Invalid IP address: {error}")
