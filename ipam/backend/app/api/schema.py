from fastapi import APIRouter, HTTPException
from sqlmodel import inspect
from typing import Dict, Any, List, Optional
from uuid import UUID
from datetime import datetime, timedelta
from pydantic import BaseModel, Field
from ..database import engine
from ..models import (
    Region, SiteGroup, Site, Location, VRF, RIR, Aggregate, Role, 
    Prefix, IPRange, IPAddress, Tenant, Device, Interface, VLAN, VLANGroup
)
from ..serializers import model_to_dict

# Create router for schema-related endpoints
router = APIRouter()

@router.get("/schema/{table_name}")
async def get_table_schema(table_name: str) -> Dict[str, Any]:
    """Get the schema information for a specific table."""
    try:
        # Get the model class for the table
        model_mapping = {
            'regions': Region,
            'site_groups': SiteGroup,
            'sites': Site,
            'locations': Location,
            'vrfs': VRF,
            'rirs': RIR,
            'aggregates': Aggregate,
            'roles': Role,
            'prefixes': Prefix,
            'ip_ranges': IPRange,
            'ip_addresses': IPAddress,
            'tenants': Tenant,
            'devices': Device,
            'interfaces': Interface,
            'vlans': VLAN,
            'vlan_groups': VLANGroup
        }
        
        if table_name not in model_mapping:
            raise HTTPException(status_code=404, detail=f"Table {table_name} not found")
        
        model_class = model_mapping[table_name]
        
        # Get table information
        inspector = inspect(engine)
        columns = inspector.get_columns(table_name)
        
        # Get foreign keys
        foreign_keys = inspector.get_foreign_keys(table_name)
        
        # Build schema information
        schema = {
            "table_name": table_name,
            "columns": [],
            "foreign_keys": []
        }
        
        # Add column information
        for column in columns:
            col_info = {
                "name": column["name"],
                "type": str(column["type"]),
                "nullable": column["nullable"],
                "default": str(column["default"]) if column["default"] is not None else None,
                "primary_key": column.get("primary_key", False)
            }
            schema["columns"].append(col_info)
        
        # Add foreign key information
        for fk in foreign_keys:
            fk_info = {
                "constrained_columns": fk["constrained_columns"],
                "referred_table": fk["referred_table"],
                "referred_columns": fk["referred_columns"]
            }
            schema["foreign_keys"].append(fk_info)
        
        return model_to_dict(schema)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error getting schema: {str(e)}")

@router.get("/reference/{table_name}/{field_name}")
async def get_reference_options(table_name: str, field_name: str, session=None):
    """
    Get options for a foreign key reference field.
    """
    from ..database import get_session
    from .. import crud
    
    # Get a session if not provided
    if session is None:
        from fastapi import Depends
        session = Depends(get_session)
    
    try:
        # Define mappings for reference fields
        reference_mappings = {
            # Table -> Field -> (Referenced Table, CRUD instance, Display Field)
            "sites": {
                "region_id": ("regions", crud.region, "name"),
                "site_group_id": ("site_groups", crud.site_group, "name"),
                "tenant_id": ("tenants", crud.tenant, "name")
            },
            "locations": {
                "site_id": ("sites", crud.site, "name"),
                "parent_id": ("locations", crud.location, "name"),
                "tenant_id": ("tenants", crud.tenant, "name")
            },
            "prefixes": {
                "site_id": ("sites", crud.site, "name"),
                "vrf_id": ("vrfs", crud.vrf, "name"),
                "tenant_id": ("tenants", crud.tenant, "name"),
                "vlan_id": ("vlans", crud.vlan, "name"),
                "role_id": ("roles", crud.role, "name")
            },
            "ip_addresses": {
                "prefix_id": ("prefixes", crud.prefix, "prefix"),
                "interface_id": ("interfaces", crud.interface, "name"),
                "tenant_id": ("tenants", crud.tenant, "name"),
                "vrf_id": ("vrfs", crud.vrf, "name")
            },
            "ip_ranges": {
                "prefix_id": ("prefixes", crud.prefix, "prefix"),
                "tenant_id": ("tenants", crud.tenant, "name"),
                "vrf_id": ("vrfs", crud.vrf, "name"),
                "role_id": ("roles", crud.role, "name")
            },
            "aggregates": {
                "rir_id": ("rirs", crud.rir, "name"),
                "tenant_id": ("tenants", crud.tenant, "name")
            },
            "interfaces": {
                "device_id": ("devices", crud.device, "name")
            },
            "vlans": {
                "site_id": ("sites", crud.site, "name"),
                "tenant_id": ("tenants", crud.tenant, "name"),
                "role_id": ("roles", crud.role, "name"),
                "group_id": ("vlan_groups", crud.vlan_group, "name")
            }
        }
        
        if table_name not in reference_mappings:
            raise HTTPException(status_code=404, detail=f"No reference mappings for table {table_name}")
        
        if field_name not in reference_mappings[table_name]:
            raise HTTPException(status_code=404, detail=f"No reference mapping for field {field_name} in table {table_name}")
        
        ref_table, crud_instance, display_field = reference_mappings[table_name][field_name]
        
        # Get all options from the referenced table
        options = crud_instance.get_all(session)
        
        # Format options for display
        formatted_options = []
        for option in options:
            option_dict = model_to_dict(option)
            formatted_options.append({
                "id": option_dict["id"],
                "label": option_dict.get(display_field, f"ID: {option_dict['id']}")
            })
        
        return model_to_dict(formatted_options)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error getting reference options: {str(e)}")

@router.get("/all-tables")
async def get_all_tables():
    """
    Get all data from all tables.
    """
    try:
        # Define the tables we want to get data from
        tables = [
            "regions", "site_groups", "sites", "locations", "vrfs", "rirs", 
            "aggregates", "roles", "prefixes", "ip_ranges", "ip_addresses", 
            "tenants", "devices", "interfaces", "vlans", "vlan_groups"
        ]
        
        # Get the base URL
        base_url = "/api/v1"
        
        # Create a dictionary of URLs for each table
        urls = {table: f"{base_url}/{table}" for table in tables}
        
        return model_to_dict(urls)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error getting tables: {str(e)}")

@router.get("/test")
async def test_endpoint():
    """
    A simple test endpoint to verify that the API is working correctly.
    """
    from ipaddress import IPv4Network, IPv6Network
    
    # Create test objects with IP networks
    test_data = {
        "ipv4_network": IPv4Network("192.168.1.0/24"),
        "ipv6_network": IPv6Network("2001:db8::/64"),
        "string": "This is a string",
        "number": 42,
        "boolean": True,
        "none": None,
        "list": [
            IPv4Network("10.0.0.0/8"),
            IPv4Network("172.16.0.0/12"),
            IPv4Network("192.168.0.0/16")
        ],
        "nested": {
            "ipv4": IPv4Network("192.168.2.0/24"),
            "ipv6": IPv6Network("2001:db8:1::/64")
        }
    }
    
    # Serialize the test data
    return model_to_dict(test_data)

# --- Network Device Schemas ---
class PlatformTypeBase(BaseModel):
    platform_signature: str = Field(..., max_length=100)
    platform_type: str = Field(..., max_length=100)
    command: Optional[str] = Field(None, max_length=100)
    ignore_platform: bool = False

class PlatformTypeCreate(PlatformTypeBase):
    # Potentially add fields from BaseModel like name/slug if needed for creation API
    name: Optional[str] = None # Example if inheriting from a base API schema
    slug: Optional[str] = None # Example if inheriting from a base API schema

class PlatformTypeRead(PlatformTypeBase):
    id: int
    # Add inherited fields if PlatformTypeBase doesn't include them
    # name: Optional[str]
    # slug: Optional[str]
    # created_at: datetime
    # updated_at: Optional[datetime]

    class Config:
        from_attributes=True


# --- NetJob Schemas ---
class NetJobBase(BaseModel):
    job_name: str = Field(..., max_length=100) # Use job_name instead of generic 'name'
    platform_type_id: Optional[int] = None # Use ID for linking on create/update
    command_list: List[str]
    is_scheduled: bool = False
    schedule_interval: Optional[timedelta] = None
    next_run: Optional[datetime] = None
    last_run: Optional[datetime] = None
    connection_protocol: str = Field('ssh', max_length=50)
    connection_library: str = Field('NETMIKO', max_length=50)
    is_encrypted: bool = False
    is_parse: bool = True
    extra_config: Optional[Dict[str, Any]] = None
    status: str = Field('ACTIVE', max_length=50)

class NetJobCreate(NetJobBase):
    # Inherits all fields from NetJobBase
    pass

class NetJobRead(NetJobBase):
    id: int
    job_uuid: UUID
    platform_type: Optional[PlatformTypeRead] = None # Nested read model
    created_at: datetime
    updated_at: Optional[datetime] # Allow Optional from BaseModel inheritance

    class Config:
        from_attributes=True


# --- DeviceInventory Schemas ---
class DeviceInventoryBase(BaseModel):
    # UUID is primary key but required on input for Timescale usually
    device_uuid: UUID
    platform_type_id: Optional[int] = None
    hostname: Optional[str] = Field(None, max_length=255)
    config_register: Optional[Dict[str, Any]] = None
    hardware: Optional[List[str]] = None
    mac_address: Optional[List[str]] = None
    release: Optional[str] = Field(None, max_length=50)
    reload_reason: Optional[str] = None
    restarted: Optional[datetime] = None
    rommon: Optional[str] = Field(None, max_length=100)
    running_image: Optional[str] = None
    serial: Optional[List[str]] = None
    software_image: Optional[str] = Field(None, max_length=255)
    uptime_weeks: Optional[int] = None
    uptime_days: Optional[int] = None
    uptime_hours: Optional[int] = None
    uptime_minutes: Optional[int] = None
    uptime_years: Optional[int] = None
    version: Optional[str] = Field(None, max_length=100)

class DeviceInventoryCreate(DeviceInventoryBase):
    # Time is usually set by DB or application logic on insert for Timescale
    # If client needs to provide it, uncomment below:
    # time: datetime = Field(default_factory=datetime.utcnow)
    pass

class DeviceInventoryRead(DeviceInventoryBase):
    time: datetime # Time is crucial for reading Timescale data
    platform_type: Optional[PlatformTypeRead] = None # Nested read model

    class Config:
        from_attributes=True

# --- End Network Device Schemas ---
