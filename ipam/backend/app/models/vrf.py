from typing import Optional, List, TYPE_CHECKING
from sqlmodel import SQLModel, Field, Relationship
from .base import BaseModel

if TYPE_CHECKING:
    from .tenant import Tenant
    from .ip_prefix import Prefix, IPRange

# Association tables for VRF-RouteTarget many-to-many relationships
class VRFImportTargets(SQLModel, table=True):
    """Association table for VRF import targets."""
    __tablename__ = "vrf_import_targets"
    
    vrf_id: Optional[int] = Field(default=None, foreign_key="vrfs.id", primary_key=True)
    route_target_id: Optional[int] = Field(default=None, foreign_key="route_targets.id", primary_key=True)


class VRFExportTargets(SQLModel, table=True):
    """Association table for VRF export targets."""
    __tablename__ = "vrf_export_targets"
    
    vrf_id: Optional[int] = Field(default=None, foreign_key="vrfs.id", primary_key=True)
    route_target_id: Optional[int] = Field(default=None, foreign_key="route_targets.id", primary_key=True)


class RouteTarget(BaseModel, table=True):
    """
    A BGP extended community used to control the redistribution of routes among VRFs,
    as defined in RFC 4364.
    """
    __tablename__ = "route_targets"
    
    # Basic fields
    name: str = Field(..., unique=True, description="Route target value (ASN:NN or IP:NN)")
    description: Optional[str] = Field(default=None, description="Brief description")
    
    # Relationships for VRF import/export targets
    importing_vrfs: List["VRF"] = Relationship(back_populates="import_targets", link_model=VRFImportTargets)
    exporting_vrfs: List["VRF"] = Relationship(back_populates="export_targets", link_model=VRFExportTargets)
    
    class Config:
        arbitrary_types_allowed = True


class VRF(BaseModel, table=True):
    """
    A Virtual Routing and Forwarding (VRF) instance represents a virtual router with its own 
    routing table, providing network segmentation and traffic isolation.
    """
    __tablename__ = "vrfs"
    
    # Basic fields
    name: str = Field(..., description="Name of the VRF")
    rd: Optional[str] = Field(default=None, description="Route distinguisher value (ASN:NN or IP:NN)")
    description: Optional[str] = Field(default=None, description="Brief description")
    enforce_unique: bool = Field(
        default=True,
        description="Prevent duplicate prefixes/IP addresses within this VRF"
    )
    
    # Foreign Keys
    tenant_id: Optional[int] = Field(default=None, foreign_key="tenants.id")
    
    # Relationships
    tenant: Optional["Tenant"] = Relationship(back_populates="vrfs")
    prefixes: List["Prefix"] = Relationship(back_populates="vrf")
    ip_ranges: List["IPRange"] = Relationship(back_populates="vrf")
    import_targets: List[RouteTarget] = Relationship(back_populates="importing_vrfs", link_model=VRFImportTargets)
    export_targets: List[RouteTarget] = Relationship(back_populates="exporting_vrfs", link_model=VRFExportTargets)
    
    class Config:
        arbitrary_types_allowed = True
