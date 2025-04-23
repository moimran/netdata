# Schemas for Organizational Models (Region, SiteGroup, Site, Location)

from typing import Optional, Dict, Any
from datetime import datetime
from pydantic import BaseModel, Field, ConfigDict

# Assuming models are imported elsewhere or adjust path as needed
# from ..models import Region, SiteGroup, Site, Location

# Region
class RegionBase(BaseModel):
    name: str = Field(..., max_length=100)
    slug: Optional[str] = Field(None, max_length=100)
    description: Optional[str] = None
    parent_id: Optional[int] = None

class RegionCreate(RegionBase):
    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "name": "North America",
                "slug": "north-america",
                "description": "North American region",
                "parent_id": None
            }
        }
    )

class RegionUpdate(RegionBase):
    name: Optional[str] = None # Make fields optional for update
    slug: Optional[str] = None
    description: Optional[str] = None
    parent_id: Optional[int] = None

class RegionRead(RegionBase):
    id: int
    # Add relationship fields if needed, e.g., parent: Optional['RegionRead'] = None
    class Config:
        from_attributes = True

# SiteGroup
class SiteGroupBase(BaseModel):
    name: str = Field(..., max_length=100)
    slug: Optional[str] = Field(None, max_length=100)
    description: Optional[str] = None
    parent_id: Optional[int] = None

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
    parent_id: Optional[int] = None

class SiteGroupRead(SiteGroupBase):
    id: int
    # parent: Optional['SiteGroupRead'] = None
    class Config:
        from_attributes = True

# Site
class SiteBase(BaseModel):
    name: str = Field(..., max_length=100)
    slug: Optional[str] = Field(None, max_length=100)
    status: str = Field(..., max_length=50)
    region_id: Optional[int] = None
    site_group_id: Optional[int] = None
    tenant_id: Optional[int] = None
    facility: Optional[str] = Field(None, max_length=100)
    asn_id: Optional[int] = None
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
                "name": "NYC Data Center 01",
                "slug": "nyc-dc-01",
                "status": "active",
                "region_id": 1, # Assuming region 1 is North America
                "site_group_id": 1, # Assuming group 1 is East Coast DCs
                "tenant_id": None,
                "facility": "Equinix NYC1",
                "asn_id": 1, # Assuming ASN 1 is assigned
                "time_zone": "America/New_York",
                "description": "Primary NYC data center",
                "physical_address": "123 Main St, New York, NY 10001",
                "shipping_address": "456 Loading Dock Ave, New York, NY 10002",
                "latitude": 40.7128,
                "longitude": -74.0060,
                "contact_name": "Site Manager",
                "contact_phone": "+1-212-555-1212",
                "contact_email": "manager.nyc1@example.com",
                "comments": "Access via main entrance only.",
                "custom_fields": {"security_level": "High"}
            }
        }
    )

class SiteUpdate(SiteBase):
    name: Optional[str] = None
    slug: Optional[str] = None
    status: Optional[str] = None
    region_id: Optional[int] = None
    site_group_id: Optional[int] = None
    tenant_id: Optional[int] = None
    facility: Optional[str] = None
    asn_id: Optional[int] = None
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
    id: int
    created_at: datetime
    updated_at: Optional[datetime] = None
    # Add relationships: region, site_group, tenant, asn etc.
    class Config:
        from_attributes = True

# Location
class LocationBase(BaseModel):
    name: str = Field(..., max_length=100)
    slug: Optional[str] = Field(None, max_length=100)
    site_id: int
    parent_id: Optional[int] = None
    description: Optional[str] = None
    tenant_id: Optional[int] = None

class LocationCreate(LocationBase):
    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "name": "Cage 101, Row B",
                "slug": "cage-101-row-b",
                "site_id": 1, # Assuming site 1 is NYC DC 01
                "parent_id": None, # Could link to a 'Floor 1' location etc.
                "description": "Main server cage",
                "tenant_id": None
            }
        }
    )

class LocationUpdate(LocationBase):
    name: Optional[str] = None
    slug: Optional[str] = None
    site_id: Optional[int] = None # Typically site wouldn't change, but allow for flexibility
    parent_id: Optional[int] = None
    description: Optional[str] = None
    tenant_id: Optional[int] = None

class LocationRead(LocationBase):
    id: int
    # site: SiteRead
    # parent: Optional['LocationRead'] = None
    # tenant: Optional[TenantRead] = None
    class Config:
        from_attributes = True
