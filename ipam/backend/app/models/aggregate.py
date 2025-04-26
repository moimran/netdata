from datetime import date
from typing import Optional, TYPE_CHECKING, ClassVar
import uuid
import sqlalchemy as sa
from sqlmodel import Field, Relationship
from .base import BaseModel
from .fields import IPNetworkType
from .ip_utils import calculate_prefix_utilization

if TYPE_CHECKING:
    from .rir import RIR
    from .tenant import Tenant


class Aggregate(BaseModel, table=True):
    """
    An aggregate exists at the root level of the IP address space hierarchy.
    Aggregates are used to organize the hierarchy and track the overall utilization
    of available address space. Each Aggregate is assigned to a RIR.
    """

    __tablename__: ClassVar[str] = "aggregates"
    __table_args__ = (
        sa.UniqueConstraint("prefix", name="uq_aggregate"),
        {"schema": "ipam"}
    )

    # Fields specific to Aggregate
    prefix: str = Field(
        ...,
        description="IPv4 or IPv6 network with mask",
        sa_column=sa.Column(IPNetworkType)
    )
    date_added: Optional[date] = Field(default=None)

    # Foreign Keys
    rir_id: uuid.UUID = Field(..., foreign_key="ipam.rirs.id")
    tenant_id: uuid.UUID = Field(..., foreign_key="ipam.tenants.id", description="Tenant this aggregate belongs to")

    # Relationships
    rir: "RIR" = Relationship(back_populates="aggregates")
    tenant: "Tenant" = Relationship(back_populates="aggregates")

    def validate(self) -> None:
        """Validate the aggregate."""
        if not self.rir_id:
            raise ValueError("RIR is required for an aggregate")

    def get_utilization(self) -> float:
        """
        Calculate the utilization of this aggregate.
        Returns percentage of utilized space.
        """
        # Note: In actual implementation, you would query the database
        # for child prefixes within this aggregate
        child_prefixes = []

        return calculate_prefix_utilization(self.prefix, child_prefixes=child_prefixes)

    class Config:
        arbitrary_types_allowed = True
