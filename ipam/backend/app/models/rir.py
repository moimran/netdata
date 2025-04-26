from typing import Optional, ClassVar, List, TYPE_CHECKING
import uuid

from sqlmodel import Field, Relationship

from app.models.base import BaseModel

if TYPE_CHECKING:
    from app.models.asn import ASN, ASNRange
    from .aggregate import Aggregate

class RIR(BaseModel, table=True):
    """
    Regional Internet Registry (RIR) - An organization that manages the allocation and registration
    of Internet number resources (IP addresses and ASNs) within a particular region of the world.
    """
    __tablename__: ClassVar[str] = "rirs"
    __table_args__ = {"schema": "ipam"}
    
    # Basic fields
    name: str = Field(..., description="Name of the RIR")
    slug: str = Field(..., description="URL-friendly name")
    description: Optional[str] = Field(default=None, description="Brief description")
    website: Optional[str] = Field(default=None, description="RIR's website URL")
    whois_server: Optional[str] = Field(default=None, description="WHOIS server hostname")
    is_private: bool = Field(
        default=False,
        description="IP space managed by this RIR is considered private"
    )
    
    # Relationships
    asn_ranges: List["ASNRange"] = Relationship(back_populates="rir")
    asns: List["ASN"] = Relationship(back_populates="rir")
    aggregates: List["Aggregate"] = Relationship(back_populates="rir")
    
    class Config:
        arbitrary_types_allowed = True
