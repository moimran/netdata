from typing import Optional, List
import sqlalchemy as sa
from sqlmodel import SQLModel, Field, Relationship
from datetime import datetime

class Credential(SQLModel, table=True):
    """
    Stores authentication credentials for devices
    """
    __tablename__ = "credentials"
    
    # Primary key
    id: Optional[int] = Field(default=None, primary_key=True)
    
    # Name must be unique
    name: str = Field(..., index=True, description="Unique name for this credential set")
    
    # Authentication fields
    username: str = Field(..., description="Username for authentication")
    password: str = Field(..., description="Password for authentication")
    enable_password: Optional[str] = Field(default=None, description="Enable/privileged password")
    
    # Default credential flag
    is_default: bool = Field(default=False, description="Whether this is the default credential for new devices")
    
    # Relationships
    devices: List["Device"] = Relationship(
        back_populates="credential",
        sa_relationship_kwargs={"foreign_keys": "[Device.credential_name]"}
    )
    fallback_devices: List["Device"] = Relationship(
        back_populates="fallback_credential",
        sa_relationship_kwargs={"foreign_keys": "[Device.fallback_credential_name]"}
    )
    
    # Add unique constraint for name
    __table_args__ = (
        sa.UniqueConstraint('name', name='uq_credential_name'),
    )
    
    class Config:
        arbitrary_types_allowed = True
