from typing import Optional, List
from uuid import UUID
from sqlmodel import SQLModel
from pydantic import Field
from datetime import datetime

class DeviceInventoryBase(SQLModel):
    hostname: str = Field(..., description="Hostname of the device")
    ip_address: str = Field(..., description="IP address of the device")
    serial_number: Optional[str] = Field(default=None, description="Serial number of the device")
    model: Optional[str] = Field(default=None, description="Model of the device")
    vendor: Optional[str] = Field(default=None, description="Vendor of the device")
    os_version: Optional[str] = Field(default=None, description="OS version of the device")
    uptime: Optional[str] = Field(default=None, description="Uptime of the device")
    last_seen: Optional[datetime] = Field(default=None, description="Last time the device was seen")
    status: Optional[str] = Field(default="active", description="Status of the device")
    
    # Foreign Keys
    site_id: Optional[UUID] = Field(default=None, description="Site ID")
    tenant_id: Optional[UUID] = Field(default=None, description="Tenant ID")
    platform_type_id: Optional[UUID] = Field(default=None, description="Platform type ID")
    credential_id: Optional[UUID] = Field(default=None, description="Credential ID")

class DeviceInventoryCreate(DeviceInventoryBase):
    pass

class DeviceInventoryUpdate(SQLModel):
    hostname: Optional[str] = None
    ip_address: Optional[str] = None
    serial_number: Optional[str] = None
    model: Optional[str] = None
    vendor: Optional[str] = None
    os_version: Optional[str] = None
    uptime: Optional[str] = None
    last_seen: Optional[datetime] = None
    status: Optional[str] = None
    site_id: Optional[UUID] = None
    tenant_id: Optional[UUID] = None
    platform_type_id: Optional[UUID] = None
    credential_id: Optional[UUID] = None

class DeviceInventoryRead(DeviceInventoryBase):
    id: UUID
