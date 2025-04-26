from typing import Optional, List, TYPE_CHECKING, ClassVar
import uuid
from sqlmodel import SQLModel, Field, Relationship

from .base import BaseModel

if TYPE_CHECKING:
    from .tenant import Tenant
    from .ip_prefix import Prefix, IPRange
    from .ip_address import IPAddress


# --- Minimal Link Models for Many-to-Many --- 
# Define these *before* VRF and RouteTarget that reference them

class VRFImportTargets(SQLModel, table=True):
    __tablename__: ClassVar[str] = "vrf_import_targets"
    __table_args__: ClassVar[dict] = {"schema": "ipam"}

    vrf_id: Optional[uuid.UUID] = Field(
        default=None, foreign_key="ipam.vrfs.id", primary_key=True
    )
    route_target_id: Optional[uuid.UUID] = Field(
        default=None, foreign_key="ipam.route_targets.id", primary_key=True
    )

class VRFExportTargets(SQLModel, table=True):
    __tablename__: ClassVar[str] = "vrf_export_targets"
    __table_args__: ClassVar[dict] = {"schema": "ipam"}

    vrf_id: Optional[uuid.UUID] = Field(
        default=None, foreign_key="ipam.vrfs.id", primary_key=True
    )
    route_target_id: Optional[uuid.UUID] = Field(
        default=None, foreign_key="ipam.route_targets.id", primary_key=True
    )

# --- End Link Models ---


class RouteTarget(BaseModel, table=True):
    """
    A BGP extended community used to control the redistribution of routes among VRFs,
    as defined in RFC 4364.
    """
    __tablename__: ClassVar[str] = "route_targets"
    __table_args__: ClassVar[dict] = {"schema": "ipam"}

    # Basic fields
    name: str = Field(..., unique=True, description="Route target value (ASN:NN or IP:NN)")

    # Relationships for VRF import/export targets
    importing_vrfs: List["VRF"] = Relationship(
        back_populates="import_targets",
        link_model=VRFImportTargets
    )
    exporting_vrfs: List["VRF"] = Relationship(
        back_populates="export_targets",
        link_model=VRFExportTargets
    )

    class Config:
        arbitrary_types_allowed = True


class VRF(BaseModel, table=True):
    """
    A Virtual Routing and Forwarding (VRF) instance represents a virtual router with its own
    routing table, providing network segmentation and traffic isolation.
    """
    __tablename__: ClassVar[str] = "vrfs"
    __table_args__: ClassVar[dict] = {"schema": "ipam"}

    # Basic fields
    name: str = Field(..., description="Name of the VRF", unique=True)
    rd: Optional[str] = Field(default=None, description="Route distinguisher value (ASN:NN or IP:NN)", unique=True)
    enforce_unique: bool = Field(
        default=True,
        description="Prevent duplicate prefixes/IP addresses within this VRF"
    )

    # Foreign Keys
    tenant_id: uuid.UUID = Field(..., foreign_key="ipam.tenants.id", description="Tenant this VRF belongs to")

    # Relationships
    tenant: "Tenant" = Relationship(back_populates="vrfs")
    prefixes: List["Prefix"] = Relationship(back_populates="vrf")
    ip_ranges: List["IPRange"] = Relationship(back_populates="vrf")
    ip_addresses: List["IPAddress"] = Relationship(back_populates="vrf")
    import_targets: List[RouteTarget] = Relationship(
        back_populates="importing_vrfs",
        link_model=VRFImportTargets
    )
    export_targets: List[RouteTarget] = Relationship(
        back_populates="exporting_vrfs",
        link_model=VRFExportTargets
    )

    class Config:
        arbitrary_types_allowed = True
