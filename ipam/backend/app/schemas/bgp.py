# Schemas for BGP and Routing Models (ASN, ASNRange, RouteTarget, VRFImportTarget, VRFExportTarget)

from typing import Optional, Dict, Any
from datetime import datetime
from pydantic import BaseModel, Field, ConfigDict

# ASN
class ASNBase(BaseModel):
    asn: int = Field(..., ge=0, le=4294967295)
    rir_id: int
    tenant_id: Optional[int] = None
    description: Optional[str] = None
    custom_fields: Optional[Dict[str, Any]] = None

class ASNCreate(ASNBase):
    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "asn": 65001,
                "rir_id": 1,
                "tenant_id": 1,
                "description": "Example Private ASN",
                "custom_fields": {"region": "Core"}
            }
        }
    )

class ASNUpdate(ASNBase):
    asn: Optional[int] = None
    rir_id: Optional[int] = None
    tenant_id: Optional[int] = None
    description: Optional[str] = None
    custom_fields: Optional[Dict[str, Any]] = None

class ASNRead(ASNBase):
    id: int
    created_at: datetime
    updated_at: Optional[datetime] = None
    # rir: RIRRead
    # tenant: Optional[TenantRead] = None
    class Config:
        from_attributes = True

# ASNRange
class ASNRangeBase(BaseModel):
    name: str = Field(..., max_length=100)
    slug: Optional[str] = Field(None, max_length=100)
    rir_id: int
    start_asn: int = Field(..., ge=0, le=4294967295)
    end_asn: int = Field(..., ge=0, le=4294967295)
    tenant_id: Optional[int] = None
    description: Optional[str] = None

class ASNRangeCreate(ASNRangeBase):
    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "name": "Private ASN Range 1",
                "slug": "private-asn-range-1",
                "rir_id": 1,
                "start_asn": 64512,
                "end_asn": 65534,
                "tenant_id": 1,
                "description": "Range for internal use"
            }
        }
    )

class ASNRangeUpdate(ASNRangeBase):
    name: Optional[str] = None
    slug: Optional[str] = None
    rir_id: Optional[int] = None
    start_asn: Optional[int] = None
    end_asn: Optional[int] = None
    tenant_id: Optional[int] = None
    description: Optional[str] = None

class ASNRangeRead(ASNRangeBase):
    id: int
    created_at: datetime
    updated_at: Optional[datetime] = None
    # rir: RIRRead
    # tenant: Optional[TenantRead] = None
    class Config:
        from_attributes = True

# RouteTarget
class RouteTargetBase(BaseModel):
    name: str = Field(..., max_length=21) # RFC 4360 format
    tenant_id: Optional[int] = None
    description: Optional[str] = None
    custom_fields: Optional[Dict[str, Any]] = None

class RouteTargetCreate(RouteTargetBase):
    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "name": "65000:1234",
                "tenant_id": 1,
                "description": "RT for VRF Blue",
                "custom_fields": {"site_code": "NYC01"}
            }
        }
    )

class RouteTargetUpdate(RouteTargetBase):
    name: Optional[str] = None
    tenant_id: Optional[int] = None
    description: Optional[str] = None
    custom_fields: Optional[Dict[str, Any]] = None

class RouteTargetRead(RouteTargetBase):
    id: int
    created_at: datetime
    updated_at: Optional[datetime] = None
    # tenant: Optional[TenantRead] = None
    class Config:
        from_attributes = True

# VRF Import/Export Targets (Association Models)
class VRFImportTargetBase(BaseModel):
    vrf_id: int
    target_id: int

class VRFImportTargetCreate(VRFImportTargetBase):
    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "vrf_id": 1,
                "target_id": 1
            }
        }
    )

class VRFImportTargetUpdate(VRFImportTargetBase):
    # Typically M2M links aren't updated directly like this, usually managed via VRF/Target endpoints
    pass

class VRFImportTargetRead(VRFImportTargetBase):
    # Might include nested VRFRead/RouteTargetRead if needed
    class Config:
        from_attributes = True

class VRFExportTargetBase(BaseModel):
    vrf_id: int
    target_id: int

class VRFExportTargetCreate(VRFExportTargetBase):
    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "vrf_id": 1,
                "target_id": 2
            }
        }
    )

class VRFExportTargetUpdate(VRFExportTargetBase):
    # Typically M2M links aren't updated directly like this
    pass

class VRFExportTargetRead(VRFExportTargetBase):
    # Might include nested VRFRead/RouteTargetRead if needed
    class Config:
        from_attributes = True
