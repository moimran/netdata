from datetime import datetime
from typing import Optional, ClassVar
from sqlmodel import SQLModel, Field, Relationship
from .timescale import HypertableModel

class DeviceMetrics(HypertableModel, table=True):
    """
    Example TimescaleDB hypertable for storing device metrics.
    
    This is a sample model showing how to create a hypertable for time-series data
    without modifying existing tables.
    """
    __tablename__ = "device_metrics"
    
    id: Optional[int] = Field(default=None, primary_key=True)
    device_id: int = Field(foreign_key="device.id")
    cpu_usage: float
    memory_usage: float
    temperature: Optional[float] = Field(default=None)
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    
    # Specify which column to use as the time dimension
    time_column_name: ClassVar[str] = "timestamp"
    # Specify chunk time interval (default: 7 days)
    chunk_time_interval: ClassVar[str] = "1 day"
