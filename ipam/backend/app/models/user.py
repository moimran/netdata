from typing import Optional, List, TYPE_CHECKING, ClassVar
import uuid
from sqlmodel import Field, Relationship
from sqlalchemy import Column, String, Table
from .base import BaseModel
from passlib.context import CryptContext

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

if TYPE_CHECKING:
    from .tenant import Tenant

class User(BaseModel, table=True):
    """
    A User represents a person who can authenticate to the system
    and is associated with a specific Tenant.
    """
    # Use ClassVar to avoid type checking issues
    __tablename__: ClassVar[str] = "users"
    __table_args__: ClassVar[dict] = {"schema": "ipam"}
    
    # Basic fields
    username: str = Field(..., description="Username for login", index=True)
    email: str = Field(..., description="Email address", index=True)
    hashed_password: str = Field(..., description="Hashed password")
    is_active: bool = Field(default=True, description="Whether the user is active")
    is_superuser: bool = Field(default=False, description="Whether the user is a superuser")
    
    # Foreign Keys
    tenant_id: Optional[uuid.UUID] = Field(default=None, foreign_key="ipam.tenants.id")
    
    # Relationships
    tenant: Optional["Tenant"] = Relationship(back_populates="users")
    
    # Helper methods
    @staticmethod
    def verify_password(plain_password, hashed_password):
        return pwd_context.verify(plain_password, hashed_password)
    
    @staticmethod
    def get_password_hash(password):
        return pwd_context.hash(password)
    
    class Config:
        arbitrary_types_allowed = True 