import uuid
from datetime import datetime
from typing import List, Optional, Dict, Any, TYPE_CHECKING, ClassVar

from sqlalchemy import Column, text, func
from sqlalchemy.dialects import postgresql
from sqlmodel import Field, Relationship

# Import the base model
from .base import BaseModel

if TYPE_CHECKING:
    from .platform import PlatformType
    pass

# --- Net Jobs ---
# Inherits id, created_at, updated_at from BaseModel -> TimestampedModel
# Use 'job_name' as the 'name' field from BaseModel.
class NetJob(BaseModel, table=True):
    __tablename__: ClassVar[str] = "net_jobs"
    __table_args__: ClassVar[dict] = {"schema": "jobs"}

    # Use job_name for the 'name' field, make slug optional
    name: str = Field(..., max_length=100, description="Job name")
    slug: Optional[str] = Field(default=None, index=True, nullable=True)

    # Specific fields
    job_uuid: uuid.UUID = Field(sa_column=Column(postgresql.UUID(as_uuid=True), unique=True, index=True, server_default=text("gen_random_uuid()"), nullable=False))
    platform_type_id: Optional[int] = Field(default=None, foreign_key="ni.platform_type.id")
    command_list: List[str] = Field(sa_column=Column(postgresql.ARRAY(postgresql.TEXT), nullable=False))
    is_scheduled: bool = Field(default=False)
    # schedule_interval: Optional[timedelta] = Field(default=None, sa_column=Column(postgresql.INTERVAL)) # REMOVED as requested
    next_run: Optional[datetime] = Field(default=None, sa_column=Column(postgresql.TIMESTAMP(timezone=True)))
    last_run: Optional[datetime] = Field(default=None, sa_column=Column(postgresql.TIMESTAMP(timezone=True)))
    connection_protocol: str = Field(default='ssh', max_length=50)
    connection_library: str = Field(default='NETMIKO', max_length=50)
    is_encrypted: bool = Field(default=False)
    is_parse: bool = Field(default=True)
    extra_config: Optional[Dict[str, Any]] = Field(default=None, sa_column=Column(postgresql.JSONB))
    status: str = Field(default='ACTIVE', max_length=50)
    # created_at, updated_at inherited

    # Relationship
    platform_type: Optional["PlatformType"] = Relationship(back_populates="net_jobs")
