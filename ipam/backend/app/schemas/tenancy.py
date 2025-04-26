# Schemas for Tenancy Models (Tenant)

from typing import Optional, Dict, Any
from datetime import datetime
import uuid
from pydantic import BaseModel, Field, ConfigDict

# Tenant
class TenantBase(BaseModel):
    name: str = Field(..., max_length=100)
    slug: Optional[str] = Field(None, max_length=100)
    description: Optional[str] = None
    comments: Optional[str] = None
    custom_fields: Optional[Dict[str, Any]] = None

class TenantCreate(TenantBase):
    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "name": "Customer Alpha",
                "slug": "customer-alpha",
                "description": "Primary enterprise customer",
                "comments": "Onboarded Q1 2024",
                "custom_fields": {"account_manager": "John Doe"}
            }
        }
    )

class TenantUpdate(TenantBase):
    name: Optional[str] = None
    slug: Optional[str] = None
    description: Optional[str] = None
    comments: Optional[str] = None
    custom_fields: Optional[Dict[str, Any]] = None

class TenantRead(TenantBase):
    id: uuid.UUID
    created_at: datetime
    updated_at: Optional[datetime] = None
    # group: Optional[TenantGroupRead] = None # Assuming TenantGroup model/schema exists
    class Config:
        from_attributes = True
