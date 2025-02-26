from typing import Optional, List, TYPE_CHECKING
from sqlmodel import SQLModel, Field, Relationship
from .base import BaseModel

if TYPE_CHECKING:
    from .asn import ASN, ASNRange
    from .aggregate import Aggregate

class RIR(BaseModel, table=True):
    """
    A Regional Internet Registry (RIR) is an organization that manages the allocation
    and registration of Internet number resources within a region.
    """
    __tablename__ = "rirs"
    
    # Basic fields
    name: str = Field(..., description="Name of the RIR")
    slug: str = Field(..., description="URL-friendly name")
    description: Optional[str] = Field(default=None, description="Brief description of the RIR")
    is_private: bool = Field(
        default=False,
        description="IP space managed by this RIR is considered private"
    )
    
    # Relationships
    asns: List["ASN"] = Relationship(back_populates="rir")
    asn_ranges: List["ASNRange"] = Relationship(back_populates="rir")
    aggregates: List["Aggregate"] = Relationship(back_populates="rir")
    
    class Config:
        arbitrary_types_allowed = True
