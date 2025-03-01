from datetime import date
from typing import Optional, List, TYPE_CHECKING
import sqlalchemy as sa
from sqlmodel import Field, Relationship
from .base import BaseModel
from .fields import IPNetworkField
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

    __tablename__ = "aggregates"

    # Fields specific to Aggregate
    prefix: str = IPNetworkField(
        description="IPv4 or IPv6 network with mask", index=True
    )
    date_added: Optional[date] = Field(default=None)

    __table_args__ = (
        sa.UniqueConstraint("prefix", name="uq_aggregate"),
    )

    # Foreign Keys
    rir_id: Optional[int] = Field(default=None, foreign_key="rirs.id")
    tenant_id: Optional[int] = Field(default=None, foreign_key="tenants.id")

    # Relationships
    rir: Optional["RIR"] = Relationship(back_populates="aggregates")
    tenant: Optional["Tenant"] = Relationship(back_populates="aggregates")

    def clean(self) -> None:
        """Validate the aggregate."""
        super().clean()

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
