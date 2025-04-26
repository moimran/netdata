from typing import Optional, Dict, Any
from datetime import datetime
from pydantic import BaseModel, Field, EmailStr, ConfigDict

# Token
class Token(BaseModel):
    access_token: str
    token_type: str
    user_id: str
    tenant_id: Optional[str] = None
    username: str
    is_superuser: bool

class TokenData(BaseModel):
    username: Optional[str] = None
    tenant_id: Optional[str] = None
    user_id: Optional[str] = None
    is_superuser: Optional[bool] = False

# User
class UserBase(BaseModel):
    username: str
    email: EmailStr
    is_active: bool = True
    is_superuser: bool = False
    tenant_id: Optional[str] = None

class UserCreate(UserBase):
    password: str
    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "username": "johndoe",
                "email": "johndoe@example.com",
                "password": "securepassword",
                "tenant_id": "550e8400-e29b-41d4-a716-446655440000",
                "is_active": True,
                "is_superuser": False
            }
        }
    )

class UserUpdate(BaseModel):
    username: Optional[str] = None
    email: Optional[EmailStr] = None
    password: Optional[str] = None
    is_active: Optional[bool] = None
    is_superuser: Optional[bool] = None
    tenant_id: Optional[str] = None

class UserRead(UserBase):
    id: str
    created_at: datetime
    updated_at: Optional[datetime] = None
    tenant_name: Optional[str] = None
    
    class Config:
        from_attributes = True

# Login 
class LoginRequest(BaseModel):
    username: str
    password: str
    
    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "username": "johndoe",
                "password": "securepassword"
            }
        }
    ) 