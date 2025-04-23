# Schemas for Automation Models (NetJob)

import uuid
from typing import Optional, Dict, Any, List
from datetime import datetime
from pydantic import BaseModel, Field, ConfigDict # Import ConfigDict for Pydantic v2

# Assuming PlatformTypeRead exists in platform.py
from .platform import PlatformTypeRead

# --- NetJob Schemas (Aligned with app/models/automation.py) ---

class NetJobBase(BaseModel):
    """Base schema for NetJob, reflecting model fields."""
    name: str = Field(..., max_length=100, description="Job name")
    slug: Optional[str] = Field(default=None, max_length=255, description="URL-friendly slug")
    description: Optional[str] = Field(default=None, description="Detailed description of the job")
    platform_type_id: Optional[int] = Field(default=None, description="ID of the associated PlatformType")
    command_list: List[str] = Field(..., description="List of commands to execute")
    is_scheduled: bool = Field(default=False, description="Whether the job is scheduled to run periodically")
    # schedule_interval: Optional[timedelta] = Field(default=None) # REMOVED
    next_run: Optional[datetime] = Field(default=None, description="Timestamp of the next scheduled run")
    last_run: Optional[datetime] = Field(default=None, description="Timestamp of the last execution")
    connection_protocol: str = Field(default='ssh', max_length=50, description="Connection protocol (e.g., ssh, telnet)")
    connection_library: str = Field(default='NETMIKO', max_length=50, description="Library used for connection (e.g., NETMIKO, NAPALM)")
    is_encrypted: bool = Field(default=False, description="Whether connection details are encrypted")
    is_parse: bool = Field(default=True, description="Whether to parse the command output")
    extra_config: Optional[Dict[str, Any]] = Field(default=None, description="Additional configuration parameters")
    status: str = Field(default='ACTIVE', max_length=50, description="Job status (e.g., ACTIVE, INACTIVE)")

class NetJobCreate(NetJobBase):
    """Schema for creating a new NetJob."""
    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "name": "Daily Backup",
                "slug": "daily-backup",
                "description": "Runs backup commands on core routers daily.",
                "platform_type_id": 1,
                "command_list": ["show running-config", "copy running-config tftp://..."],
                "is_scheduled": True,
                "next_run": "2025-05-01T02:00:00Z", # Example timestamp
                "last_run": None,
                "connection_protocol": "ssh",
                "connection_library": "NETMIKO",
                "is_encrypted": False,
                "is_parse": True,
                "extra_config": {"delay_factor": 2},
                "status": "ACTIVE"
            }
        }
    )

class NetJobUpdate(NetJobBase):
    """Schema for updating an existing NetJob. All fields are optional."""
    name: Optional[str] = None
    slug: Optional[str] = None
    description: Optional[str] = None
    platform_type_id: Optional[int] = None
    command_list: Optional[List[str]] = None
    is_scheduled: Optional[bool] = None
    next_run: Optional[datetime] = None
    last_run: Optional[datetime] = None
    connection_protocol: Optional[str] = None
    connection_library: Optional[str] = None
    is_encrypted: Optional[bool] = None
    is_parse: Optional[bool] = None
    extra_config: Optional[Dict[str, Any]] = None
    status: Optional[str] = None

class NetJobRead(NetJobBase):
    """Schema for reading NetJob data, including generated fields."""
    id: int
    job_uuid: uuid.UUID
    created_at: datetime
    updated_at: Optional[datetime] = None
    platform_type: Optional[PlatformTypeRead] = None # Include related platform type

    model_config = ConfigDict(
        from_attributes=True # Use model_config for Pydantic v2
    )
