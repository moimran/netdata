# Schemas for Device and Inventory Models (Device, Interface, DeviceInventory)

# NOTE: 'Device' represents the core network device tracked in IPAM (e.g., router, switch).
#       'DeviceInventory' represents components *of* a Device (e.g., modules, power supplies)
#       often discovered through network automation.

from typing import Optional, Dict, Any
from datetime import datetime
from pydantic import BaseModel, Field, ConfigDict

# Device (Core IPAM Network Device)
class DeviceBase(BaseModel):
    name: Optional[str] = Field(None, max_length=100, description="Name of the device") # Kept Optional for Base/Update
    description: Optional[str] = Field(default=None, description="Brief description") # Added from model
    tenant_id: Optional[int] = None
    site_id: Optional[int] = None # Changed from int to Optional[int] to match model
    location_id: Optional[int] = None
    ip_address_id: Optional[int] = None # ADDED from model
    credential_name: Optional[str] = None # ADDED from model
    fallback_credential_name: Optional[str] = None # ADDED from model

class DeviceCreate(DeviceBase):
    name: str = Field(..., max_length=100, description="Name of the device") # Make name required for Create

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "name": "core-router-01",
                "description": "Main core router for NYC site.",
                "tenant_id": 1,
                "site_id": 1,
                "location_id": 1,
                "ip_address_id": 10, # Example IP Address ID
                "credential_name": "global-creds",
                "fallback_credential_name": None
            }
        }
    )

class DeviceUpdate(DeviceBase):
    # Fields are already optional in DeviceBase, no need to repeat Optional types here
    pass # All fields are optional via inheritance

class DeviceRead(DeviceBase):
    id: int
    created_at: datetime
    updated_at: Optional[datetime] = None
    # Relationships based on models/device.py
    # site: Optional[SiteRead] = None
    # tenant: Optional[TenantRead] = None
    # location: Optional[LocationRead] = None
    # interfaces: List[InterfaceRead] = []
    # ip_address: Optional[IPAddressRead] = None
    # credential: Optional[CredentialRead] = None
    # fallback_credential: Optional[CredentialRead] = None

    class Config:
        from_attributes = True

# Interface
class InterfaceBase(BaseModel):
    device_id: int
    name: str = Field(..., max_length=64)
    label: Optional[str] = Field(None, max_length=64)
    type: str = Field(..., max_length=50) # e.g., '1000base-t', '10gbase-t'
    enabled: bool = True
    parent_id: Optional[int] = None
    mtu: Optional[int] = None
    mac_address: Optional[str] = None # Handled by validator
    wwn: Optional[str] = None # Handled by validator
    mgmt_only: bool = False
    description: Optional[str] = None
    mode: Optional[str] = Field(None, max_length=50) # e.g., 'access', 'tagged', 'tagged-all'
    rf_role: Optional[str] = Field(None, max_length=50) # Specific to wireless
    rf_channel: Optional[str] = Field(None, max_length=50)
    rf_channel_frequency: Optional[float] = None
    rf_channel_width: Optional[float] = None
    tx_power: Optional[int] = None
    untagged_vlan_id: Optional[int] = None
    # tagged_vlans: Needs many-to-many relationship handling
    mark_connected: bool = False
    # cable: Needs relationship handling
    # wireless_lans: Needs relationship handling
    # wireless_link: Needs relationship handling
    # link_peer: Needs relationship handling
    custom_fields: Optional[Dict[str, Any]] = None

class InterfaceCreate(InterfaceBase):
    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "device_id": 1, # Assuming device ID 1 exists
                "name": "GigabitEthernet0/1",
                "label": "Uplink to ISP",
                "type": "1000base-t",
                "enabled": True,
                "parent_id": None,
                "mtu": 1500,
                "mac_address": "00:11:22:33:44:55",
                "wwn": None,
                "mgmt_only": False,
                "description": "Primary ISP connection",
                "mode": "tagged",
                "untagged_vlan_id": None,
                "mark_connected": False,
                "custom_fields": {"circuit_id": "CIRCUIT-XYZ"}
                # Fields like rf_*, tagged_vlans, cable etc. omitted for basic example
            }
        }
    )

class InterfaceUpdate(InterfaceBase):
    device_id: Optional[int] = None
    name: Optional[str] = None
    label: Optional[str] = None
    type: Optional[str] = None
    enabled: Optional[bool] = None
    parent_id: Optional[int] = None
    mtu: Optional[int] = None
    mac_address: Optional[str] = None
    wwn: Optional[str] = None
    mgmt_only: Optional[bool] = None
    description: Optional[str] = None
    mode: Optional[str] = None
    rf_role: Optional[str] = None
    rf_channel: Optional[str] = None
    rf_channel_frequency: Optional[float] = None
    rf_channel_width: Optional[float] = None
    tx_power: Optional[int] = None
    untagged_vlan_id: Optional[int] = None
    mark_connected: Optional[bool] = None
    custom_fields: Optional[Dict[str, Any]] = None

class InterfaceRead(InterfaceBase):
    id: int
    created_at: datetime
    updated_at: Optional[datetime] = None
    # device: DeviceRead
    # parent: Optional[InterfaceRead] = None # Self-referential
    # untagged_vlan: Optional[VLANRead] = None
    # tagged_vlans: List[VLANRead] = []
    class Config:
        from_attributes = True

# DeviceInventory (Component/Module of a Device)
class DeviceInventoryBase(BaseModel):
    device_id: int
    name: str = Field(..., max_length=100)
    label: Optional[str] = Field(None, max_length=100)
    manufacturer_id: Optional[int] = None # Assuming Manufacturer model exists
    serial: Optional[str] = Field(None, max_length=50)
    asset_tag: Optional[str] = Field(None, max_length=50)
    discovered: bool = False
    description: Optional[str] = None
    part_id: Optional[str] = Field(None, max_length=100)
    custom_fields: Optional[Dict[str, Any]] = None

class DeviceInventoryCreate(DeviceInventoryBase):
    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "device_id": 1, # Assuming device ID 1 exists
                "name": "Power Supply Unit 1",
                "label": "PSU-1",
                "manufacturer_id": 1, # Assuming manufacturer ID 1 exists
                "serial": "PSU123456",
                "asset_tag": "PSUASSET1",
                "discovered": False,
                "description": "Primary power supply",
                "part_id": "PWR-C1-715WAC",
                "custom_fields": {"warranty_expires": "2026-01-15"}
            }
        }
    )

class DeviceInventoryUpdate(DeviceInventoryBase):
    device_id: Optional[int] = None
    name: Optional[str] = None
    label: Optional[str] = None
    manufacturer_id: Optional[int] = None
    serial: Optional[str] = None
    asset_tag: Optional[str] = None
    discovered: Optional[bool] = None
    description: Optional[str] = None
    part_id: Optional[str] = None
    custom_fields: Optional[Dict[str, Any]] = None

class DeviceInventoryRead(DeviceInventoryBase):
    id: int
    created_at: datetime
    updated_at: Optional[datetime] = None
    # device: DeviceRead
    # manufacturer: Optional[ManufacturerRead] = None
    class Config:
        from_attributes = True
