from datetime import date
from typing import Optional, List, TYPE_CHECKING
from sqlmodel import SQLModel, Field, Relationship
from .base import BaseModel
from .ip_constants import *
from .fields import IPNetworkField
from .ip_utils import calculate_prefix_utilization

# Import models instead of redefining them
from .rir import RIR
from .aggregate import Aggregate
if TYPE_CHECKING:
    from .tenant import Tenant
    from .location import Location
    from .device import Device
    from .interface import Interface
