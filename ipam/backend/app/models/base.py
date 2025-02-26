from datetime import datetime
from typing import Optional
from sqlmodel import SQLModel, Field

class TimestampedModel(SQLModel):
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: Optional[datetime] = Field(default=None)
    
class BaseModel(TimestampedModel):
    id: Optional[int] = Field(default=None, primary_key=True)
    name: str = Field(index=True)
    slug: str = Field(index=True)
    description: Optional[str] = Field(default=None)

    class Config:
        arbitrary_types_allowed = True
