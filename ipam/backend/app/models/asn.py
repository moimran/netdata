from typing import Optional, TYPE_CHECKING, ClassVar, List
import uuid
import sqlalchemy as sa
from sqlmodel import Field, Relationship, Session, select
from .base import BaseModel

if TYPE_CHECKING:
    from .rir import RIR
    from .asn import ASN
    from .tenant import Tenant

class ASNRange(BaseModel, table=True):
    """
    A range of Autonomous System Numbers (ASNs) that can be assigned to organizations.
    ASN ranges are typically allocated by Regional Internet Registries (RIRs) to specific tenants.
    Ranges must not overlap with other ranges within the same tenant.
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
    start: int = Field(..., description="First ASN in the range", sa_column=sa.Column(sa.BigInteger))
    end: int = Field(..., description="Last ASN in the range", sa_column=sa.Column(sa.BigInteger))
    
    # Foreign Keys
    rir_id: uuid.UUID = Field(..., foreign_key="ipam.rirs.id")
    tenant_id: uuid.UUID = Field(..., foreign_key="ipam.tenants.id", description="Tenant this ASN range belongs to")
    
    # Relationships
    rir: "RIR" = Relationship(back_populates="asn_ranges")
    tenant: "Tenant" = Relationship(back_populates="asn_ranges")
    asns: List["ASN"] = Relationship(back_populates="range")
    
    def validate(self, session: Session) -> None:
        """
        Validate the ASN range:
        1. Ensure start ASN is less than end ASN
        2. Check for overlaps with existing ranges within the same tenant
        
        Args:
            session: SQLAlchemy session for querying existing ranges
            
        Raises:
            ValueError: If validation fails
        """
        # Validate start < end
        if self.start >= self.end:
            raise ValueError(f"Start ASN {self.start} must be less than end ASN {self.end}")
            
        # Query for existing ranges within the same tenant
        query = select(ASNRange).where(
            ASNRange.tenant_id == self.tenant_id,
            ASNRange.id != self.id  # Exclude self when updating
        )
        existing_ranges = session.exec(query).all()
        
        # Check for overlaps with each existing range
        for existing in existing_ranges:
            if self._ranges_overlap(existing):
                raise ValueError(
                    f"ASN range {self.start}-{self.end} overlaps with existing range "
                    f"{existing.start}-{existing.end} ({existing.name})"
                )
    
    def _ranges_overlap(self, other: "ASNRange") -> bool:
        """
        Check if this range overlaps with another range.
        
        This method implements a comprehensive overlap check between two ASN ranges.
        An overlap occurs in any of these scenarios:
        1. One range's start number falls within the other range
        2. One range's end number falls within the other range
        3. One range completely contains the other range
        
        Examples:
            # Case 1: Overlapping ranges
            Range 1: 1000-2000
            Range 2: 1500-2500
            Result: True (overlaps from 1500-2000)
            
            # Case 2: One range inside another
            Range 1: 1000-3000
            Range 2: 1500-2000
            Result: True (Range 2 is contained within Range 1)
            
            # Case 3: Ranges touching at endpoints
            Range 1: 1000-2000
            Range 2: 2000-3000
            Result: True (overlaps at 2000)
            
            # Case 4: No overlap
            Range 1: 1000-2000
            Range 2: 2001-3000
            Result: False (gap between ranges)
            
            # Case 5: Adjacent ranges
            Range 1: 1000-2000
            Range 2: 2001-3000
            Result: False (ranges are adjacent but don't overlap)
        
        Args:
            other: Another ASNRange instance to check against this one
            
        Returns:
            bool: True if the ranges overlap, False otherwise
            
        Note:
            - This check is commutative: a.overlaps(b) == b.overlaps(a)
            - Ranges that touch at endpoints (e.g., 1-100 and 100-200) are considered overlapping
            - The check is inclusive of endpoints (closed intervals)
        """
        # Check all possible overlap scenarios:
        return (
            (self.start <= other.start <= self.end) or  # other start within this range
            (self.start <= other.end <= self.end) or    # other end within this range
            (other.start <= self.start <= other.end) or # this start within other range
            (other.start <= self.end <= other.end)      # this end within other range
        )
    
    class Config:
        arbitrary_types_allowed = True


class ASN(BaseModel, table=True):
    """
    An Autonomous System Number (ASN) is a unique identifier for networks on the internet.
    ASNs are managed by Regional Internet Registries (RIRs) and assigned to specific tenants.
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
    tenant_id: uuid.UUID = Field(..., foreign_key="ipam.tenants.id", description="Tenant this ASN belongs to")
    
    # Relationships
    rir: "RIR" = Relationship(back_populates="asns")
    range: "ASNRange" = Relationship(back_populates="asns")
    tenant: "Tenant" = Relationship(back_populates="asns")
    
    def validate(self) -> None:
        """
        Validate that the ASN number is within its range if assigned to one.
        """
        if self.range:
            if not (self.range.start <= self.number <= self.range.end):
                raise ValueError(f"ASN {self.number} is not within range {self.range.start}-{self.range.end}")
    
    class Config:
        arbitrary_types_allowed = True
