# Schemas for Organizational Models (Region, SiteGroup, Site, Location)

from typing import Optional, Dict, Any
from datetime import datetime
import uuid
from pydantic import BaseModel, Field, ConfigDict

# Assuming models are imported elsewhere or adjust path as needed
# from ..models import Region, SiteGroup, Site, Location

# Region
class RegionBase(BaseModel):
    name: str = Field(..., max_length=100)
    slug: Optional[str] = Field(None, max_length=100)
    description: Optional[str] = None
    parent_id: Optional[uuid.UUID] = None
    tenant_id: uuid.UUID

class RegionCreate(RegionBase):
    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "name": "North America",
                "slug": "north-america",
                "description": "North American Region",
                "parent_id": None,
                "tenant_id": "00000000-0000-0000-0000-000000000000"
            }
        }
    )

class RegionUpdate(RegionBase):
    name: Optional[str] = None
    slug: Optional[str] = None
    description: Optional[str] = None
    parent_id: Optional[uuid.UUID] = None
    tenant_id: Optional[uuid.UUID] = None

class RegionRead(RegionBase):
    id: uuid.UUID
    created_at: datetime
    updated_at: Optional[datetime] = None
    class Config:
        from_attributes = True

# SiteGroup
class SiteGroupBase(BaseModel):
    name: str = Field(..., max_length=100)
    slug: Optional[str] = Field(None, max_length=100)
    description: Optional[str] = None
    parent_id: Optional[uuid.UUID] = None

class SiteGroupCreate(SiteGroupBase):
    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "name": "East Coast Data Centers",
                "slug": "east-coast-dcs",
                "description": "All DCs on the US East Coast",
                "parent_id": None
            }
        }
    )

class SiteGroupUpdate(SiteGroupBase):
    name: Optional[str] = None
    slug: Optional[str] = None
    description: Optional[str] = None
    parent_id: Optional[uuid.UUID] = None

class SiteGroupRead(SiteGroupBase):
    id: uuid.UUID
    class Config:
        from_attributes = True

# Site
class SiteBase(BaseModel):
    name: str = Field(..., max_length=100)
    slug: Optional[str] = Field(None, max_length=100)
    status: str = Field(..., max_length=50)
    region_id: Optional[uuid.UUID] = None
    site_group_id: Optional[uuid.UUID] = None
    tenant_id: Optional[uuid.UUID] = None
    facility: Optional[str] = Field(None, max_length=100)
    asn_id: Optional[uuid.UUID] = None
    time_zone: Optional[str] = Field(None, max_length=50)
    description: Optional[str] = None
    physical_address: Optional[str] = None
    shipping_address: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    contact_name: Optional[str] = Field(None, max_length=100)
    contact_phone: Optional[str] = Field(None, max_length=20)
    contact_email: Optional[str] = Field(None, max_length=255)
    comments: Optional[str] = None
    custom_fields: Optional[Dict[str, Any]] = None

class SiteCreate(SiteBase):
    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "name": "Main Office",
                "slug": "main-office",
                "status": "active",
                "region_id": "123e4567-e89b-12d3-a456-426614174000",
                "description": "Main office location"
            }
        }
    )

class SiteUpdate(SiteBase):
    name: Optional[str] = None
    slug: Optional[str] = None
    status: Optional[str] = None
    region_id: Optional[uuid.UUID] = None
    site_group_id: Optional[uuid.UUID] = None
    tenant_id: Optional[uuid.UUID] = None
    facility: Optional[str] = None
    asn_id: Optional[uuid.UUID] = None
    time_zone: Optional[str] = None
    description: Optional[str] = None
    physical_address: Optional[str] = None
    shipping_address: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    contact_name: Optional[str] = None
    contact_phone: Optional[str] = None
    contact_email: Optional[str] = None
    comments: Optional[str] = None
    custom_fields: Optional[Dict[str, Any]] = None

class SiteRead(SiteBase):
    id: uuid.UUID
    created_at: datetime
    updated_at: Optional[datetime] = None
    class Config:
        from_attributes = True

# Location
class LocationBase(BaseModel):
    name: str = Field(..., max_length=100)
    slug: Optional[str] = Field(None, max_length=100)
    site_id: uuid.UUID
    parent_id: Optional[uuid.UUID] = None
    description: Optional[str] = None
    tenant_id: Optional[uuid.UUID] = None

class LocationCreate(LocationBase):
    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "name": "Cage 101, Row B",
                "slug": "cage-101-row-b",
                "site_id": "123e4567-e89b-12d3-a456-426614174000",
                "parent_id": None,
                "description": "Main server cage",
                "tenant_id": None
            }
        }
    )

class LocationUpdate(LocationBase):
    name: Optional[str] = None
    slug: Optional[str] = None
    site_id: Optional[uuid.UUID] = None
    parent_id: Optional[uuid.UUID] = None
    description: Optional[str] = None
    tenant_id: Optional[uuid.UUID] = None

class LocationRead(LocationBase):
    id: uuid.UUID
    class Config:
        from_attributes = True
