from typing import Optional, TYPE_CHECKING, ClassVar, List
import uuid
import sqlalchemy as sa
from sqlmodel import Field, Relationship
from .base import BaseModel

if TYPE_CHECKING:
    from .rir import RIR
    from .asn import ASN

class ASNRange(BaseModel, table=True):
    """
    A range of Autonomous System Numbers (ASNs) that can be assigned to organizations.
    ASN ranges are typically allocated by Regional Internet Registries (RIRs).
    """
    __tablename__: ClassVar[str] = "asn_ranges"
    __table_args__ = (
        sa.UniqueConstraint('name', name='uq_asn_range_name'),
        sa.UniqueConstraint('slug', name='uq_asn_range_slug'),
        {"schema": "ipam"}
    )
    
    # Basic fields
    name: str = Field(..., description="Name of the ASN range")
    slug: str = Field(..., description="URL-friendly name")
    description: Optional[str] = Field(default=None, description="Brief description")
    start: int = Field(..., description="First ASN in the range", sa_column=sa.Column(sa.BigInteger))
    end: int = Field(..., description="Last ASN in the range", sa_column=sa.Column(sa.BigInteger))
    
    # Foreign Keys
    rir_id: uuid.UUID = Field(..., foreign_key="ipam.rirs.id")
    
    # Relationships
    rir: "RIR" = Relationship(back_populates="asn_ranges")
    asns: List["ASN"] = Relationship(back_populates="range")
    
    def validate(self) -> None:
        """
        Validate that the start ASN is less than the end ASN.
        """
        if self.start >= self.end:
            raise ValueError(f"Start ASN {self.start} must be less than end ASN {self.end}")
    
    class Config:
        arbitrary_types_allowed = True


class ASN(BaseModel, table=True):
    """
    An Autonomous System Number (ASN) is a unique identifier for networks on the internet.
    ASNs are managed by Regional Internet Registries (RIRs) and assigned to organizations.
    """
    __tablename__: ClassVar[str] = "asns"
    __table_args__ = (
        sa.UniqueConstraint('number', name='uq_asn_number'),
        sa.UniqueConstraint('slug', name='uq_asn_slug'),
        {"schema": "ipam"}
    )
    
    # Basic fields
    number: int = Field(
        ..., 
        description="The ASN number",
        sa_column=sa.Column(sa.BigInteger, index=True, unique=True)
    )
    name: str = Field(..., description="Name of the autonomous system")
    slug: str = Field(..., description="URL-friendly name")
    description: Optional[str] = Field(default=None, description="Brief description")
    
    # Foreign Keys
    rir_id: uuid.UUID = Field(..., foreign_key="ipam.rirs.id")
    range_id: uuid.UUID = Field(..., foreign_key="ipam.asn_ranges.id")
    
    # Relationships
    rir: "RIR" = Relationship(back_populates="asns")
    range: "ASNRange" = Relationship(back_populates="asns")
    
    def validate(self) -> None:
        """
        Validate that the ASN number is within its range if assigned to one.
        """
        if self.range:
            if not (self.range.start <= self.number <= self.range.end):
                raise ValueError(f"ASN {self.number} is not within range {self.range.start}-{self.range.end}")
    
    class Config:
        arbitrary_types_allowed = True
