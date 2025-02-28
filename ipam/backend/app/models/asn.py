from typing import Optional, List, TYPE_CHECKING
import sqlalchemy as sa
from sqlmodel import SQLModel, Field, Relationship
from .base import BaseModel

if TYPE_CHECKING:
    from .rir import RIR

class ASNRange(BaseModel, table=True):
    """
    A range of ASN numbers managed by a Regional Internet Registry (RIR).
    """
    __tablename__ = "asn_ranges"
    
    start: int = Field(..., description="Starting ASN number")
    end: int = Field(..., description="Ending ASN number")
    
    # Foreign Keys
    rir_id: Optional[int] = Field(default=None, foreign_key="rirs.id")
    
    # Add a unique constraint for ASN range within an RIR
    __table_args__ = (
        sa.UniqueConstraint('start', 'end', 'rir_id', name='uq_asnrange_rir'),
    )
    
    # Relationships
    rir: Optional["RIR"] = Relationship(back_populates="asn_ranges")
    
    def range_as_string(self) -> str:
        """Return the range as a string in format 'start-end'."""
        return f"{self.start}-{self.end}"
    
    def clean(self) -> None:
        """Validate that start is less than end."""
        if self.end <= self.start:
            raise ValueError(
                f"Starting ASN ({self.start}) must be lower than ending ASN ({self.end})."
            )
    
    class Config:
        arbitrary_types_allowed = True


class ASN(BaseModel, table=True):
    """
    An Autonomous System Number (ASN) represents an independent routing domain.
    """
    __tablename__ = "asns"
    
    asn: int = Field(..., unique=True, description="16- or 32-bit autonomous system number")
    name: str = Field(..., description="Name of the ASN")
    slug: str = Field(..., description="URL-friendly name")
    description: Optional[str] = Field(default=None, description="Brief description of the ASN")
    
    # Foreign Keys
    rir_id: Optional[int] = Field(default=None, foreign_key="rirs.id")
    
    # Relationships
    rir: Optional["RIR"] = Relationship(back_populates="asns")
    
    @property
    def asn_asdot(self) -> str:
        """Return ASDOT notation for AS numbers greater than 16 bits."""
        if self.asn > 65535:
            return f"{self.asn >> 16}.{self.asn & 0xFFFF}"
        return str(self.asn)
    
    class Config:
        arbitrary_types_allowed = True
