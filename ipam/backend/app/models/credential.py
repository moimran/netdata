from typing import Optional, ClassVar
import sqlalchemy as sa
from .base import BaseModel
from sqlmodel import Field

class Credential(BaseModel, table=True):
    """
    Stores authentication credentials for devices
    """
    __tablename__: ClassVar[str] = "credentials"
    
    # Name must be unique
    name: str = Field(..., index=True, description="Unique name for this credential set")
    
    # Authentication fields
    username: str = Field(..., description="Username for authentication")
    password: str = Field(..., description="Password for authentication")
    enable_password: Optional[str] = Field(default=None, description="Enable/privileged password")
    
    # Default credential flag
    is_default: bool = Field(default=False, description="Whether this is the default credential for new devices")
    
    # Add unique constraint for name
    __table_args__ = (
        sa.UniqueConstraint('name', name='uq_credential_name'),
        {"schema": "ipam"},
    )
    
    class Config:
        arbitrary_types_allowed = True
