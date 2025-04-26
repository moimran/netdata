from typing import Optional, ClassVar, List, TYPE_CHECKING
import uuid

from sqlmodel import Field, Relationship

from app.models.base import BaseModel

if TYPE_CHECKING:
    from app.models.asn import ASN, ASNRange
    from .aggregate import Aggregate
    from .tenant import Tenant

class RIR(BaseModel, table=True):
    """
    Regional Internet Registry (RIR) - An organization that manages the allocation and registration
    of Internet number resources (IP addresses and ASNs) within a particular region of the world.
    Each tenant can have their own RIR relationships and allocations.
    """
    __tablename__: ClassVar[str] = "rirs"
    __table_args__ = {"schema": "ipam"}
    
    # Basic fields
    name: str = Field(..., description="Name of the RIR")
    slug: str = Field(..., description="URL-friendly name")
    is_private: bool = Field(
        default=False,
        description="IP space managed by this RIR is considered private"
    )
    
    # Foreign Keys
    tenant_id: uuid.UUID = Field(..., foreign_key="ipam.tenants.id", description="Tenant this RIR belongs to")
    
    # Relationships
    tenant: "Tenant" = Relationship(back_populates="rirs")
    asn_ranges: List["ASNRange"] = Relationship(back_populates="rir")
    asns: List["ASN"] = Relationship(back_populates="rir")
    aggregates: List["Aggregate"] = Relationship(back_populates="rir")
    
    class Config:
        arbitrary_types_allowed = True
