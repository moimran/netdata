from typing import Optional, List
from sqlmodel import SQLModel

# Schemas for RouteTarget
class RouteTargetBase(SQLModel):
    name: str
    description: Optional[str] = None

class RouteTargetCreate(RouteTargetBase):
    pass

class RouteTargetUpdate(SQLModel):
    name: Optional[str] = None
    description: Optional[str] = None

class RouteTargetRead(RouteTargetBase):
    id: int

# Schemas for VRF
class VRFBase(SQLModel):
    name: str
    rd: Optional[str] = None
    description: Optional[str] = None
    enforce_unique: bool = True
    tenant_id: Optional[int] = None

class VRFCreate(VRFBase):
    import_target_ids: Optional[List[int]] = [] # List of RouteTarget IDs
    export_target_ids: Optional[List[int]] = [] # List of RouteTarget IDs

class VRFUpdate(SQLModel):
    name: Optional[str] = None
    rd: Optional[str] = None
    description: Optional[str] = None
    enforce_unique: Optional[bool] = None
    tenant_id: Optional[int] = None
    import_target_ids: Optional[List[int]] = None # Allow updating targets
    export_target_ids: Optional[List[int]] = None

class VRFRead(VRFBase):
    id: int

class VRFReadWithTargets(VRFRead):
    import_targets: List[RouteTargetRead] = []
    export_targets: List[RouteTargetRead] = []

# Schema for associating/dissociating targets (if needed for specific endpoints)
class VRFTargetAssociation(SQLModel):
    route_target_id: int
