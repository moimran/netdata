# Schemas for Platform Type Models (PlatformType)

from typing import Optional
from pydantic import BaseModel, Field, ConfigDict

# PlatformType
class PlatformTypeBase(BaseModel):
    platform_signature: str = Field(..., max_length=100)
    platform_type: str = Field(..., max_length=100)
    description: Optional[str] = None

class PlatformTypeCreate(PlatformTypeBase):
    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "platform_signature": "cisco_ios",
                "platform_type": "router",
                "description": "Standard Cisco IOS Router"
            }
        }
    )

class PlatformTypeUpdate(PlatformTypeBase):
    platform_signature: Optional[str] = None
    platform_type: Optional[str] = None
    description: Optional[str] = None

class PlatformTypeRead(PlatformTypeBase):
    id: int
    class Config:
        from_attributes = True
