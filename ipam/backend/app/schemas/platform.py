# Schemas for Platform Type Models (PlatformType)

from typing import Optional
from pydantic import BaseModel, Field, ConfigDict

# PlatformType
class PlatformTypeBase(BaseModel):
    # Fields from model (app/models/platform.py)
    name: Optional[str] = Field(default=None, max_length=100)
    slug: Optional[str] = Field(default=None, max_length=100)
    description: Optional[str] = Field(default=None)
    platform_signature: str = Field(..., max_length=100)
    platform_type: str = Field(..., max_length=100)
    command: Optional[str] = Field(default=None, max_length=100)
    ignore_platform: bool = Field(default=False)

class PlatformTypeCreate(PlatformTypeBase):
    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "name": "Cisco IOS Router", 
                "slug": "cisco-ios-router", 
                "platform_signature": "CiscoIos",
                "platform_type": "cisco_ios",
                "description": "Standard Cisco IOS Router",
                "command": "show version", 
                "ignore_platform": False 
            }
        }
    )

class PlatformTypeUpdate(PlatformTypeBase):
    # Make all fields optional for update
    name: Optional[str] = None
    slug: Optional[str] = None
    description: Optional[str] = None
    platform_signature: Optional[str] = None
    platform_type: Optional[str] = None
    command: Optional[str] = None
    ignore_platform: Optional[bool] = None

class PlatformTypeRead(PlatformTypeBase):
    id: int
    class Config:
        from_attributes = True
