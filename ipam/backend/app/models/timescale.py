from datetime import datetime
from typing import Optional, ClassVar, Dict, Any
from sqlmodel import SQLModel, Field
from .base import TimestampedModel

class HypertableModel(TimestampedModel):
    """
    Base model for TimescaleDB hypertables.
    
    This class should be inherited by any model that needs to be a hypertable.
    The time_column_name class variable should be set to the name of the column
    that will be used as the time dimension for the hypertable.
    
    Example:
        class DeviceMetrics(HypertableModel, table=True):
            __tablename__ = "device_metrics"
            
            id: Optional[int] = Field(default=None, primary_key=True)
            device_id: int = Field(foreign_key="device.id")
            cpu_usage: float
            memory_usage: float
            timestamp: datetime = Field(default_factory=datetime.utcnow)
            
            # Specify which column to use as the time dimension
            time_column_name: ClassVar[str] = "timestamp"
            # Optional: Specify chunk time interval (default: 7 days)
            chunk_time_interval: ClassVar[str] = "7 days"
    """
    # Class variables to be overridden by subclasses
    time_column_name: ClassVar[str] = "created_at"
    chunk_time_interval: ClassVar[str] = "7 days"
    
    # This ensures the model isn't registered as a table itself
    class Config:
        arbitrary_types_allowed = True
