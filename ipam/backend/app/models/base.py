from datetime import datetime
from typing import Optional
import uuid
from sqlmodel import SQLModel, Field
from sqlalchemy.dialects import postgresql
from sqlalchemy import Column
from ..types import UUIDType

class TimestampedModel(SQLModel):
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: Optional[datetime] = Field(default=None)
    
class BaseModel(TimestampedModel):
    id: uuid.UUID = Field(
        default_factory=uuid.uuid4,
        primary_key=True,
        sa_type=UUIDType
    )
    description: Optional[str] = Field(default=None)

    class Config:
        arbitrary_types_allowed = True
