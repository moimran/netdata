# Schemas for Credential Management Models (Credential)

from typing import Optional, Dict, Any
from datetime import datetime
from pydantic import BaseModel, Field, ConfigDict

# Credential
class CredentialBase(BaseModel):
    name: str = Field(..., max_length=100)
    credential_type_id: int # Assuming CredentialType model exists
    description: Optional[str] = None
    comments: Optional[str] = None
    custom_fields: Optional[Dict[str, Any]] = None
    # data: Sensitive data, handle carefully - maybe not in base?

class CredentialCreate(CredentialBase):
    data: Optional[Dict[str, Any]] = None # Allow setting data on create
    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "name": "Router SSH Creds",
                "credential_type_id": 1, # Assuming 1 maps to 'SSH Username/Password'
                "description": "Credentials for accessing core routers",
                "comments": "Rotate quarterly",
                "custom_fields": {"owner_team": "Network Ops"},
                "data": {"username": "admin", "password": "secretpassword123"} # Example sensitive data
            }
        }
    )

class CredentialUpdate(CredentialBase):
    name: Optional[str] = None
    credential_type_id: Optional[int] = None
    description: Optional[str] = None
    comments: Optional[str] = None
    custom_fields: Optional[Dict[str, Any]] = None
    data: Optional[Dict[str, Any]] = None # Allow updating data

class CredentialRead(CredentialBase):
    id: int
    created_at: datetime
    updated_at: Optional[datetime] = None
    # credential_type: CredentialTypeRead # Assuming CredentialTypeRead exists
    # Exclude 'data' field from default read schema for security
    class Config:
        from_attributes = True
