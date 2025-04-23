# Schemas for Device and Inventory Models (Device, Interface, DeviceInventory)

from typing import Optional, Dict, Any
from datetime import datetime
from pydantic import BaseModel, Field, ConfigDict

# Device
class DeviceBase(BaseModel):
    name: Optional[str] = Field(None, max_length=100)
    device_type_id: int
    role_id: int
    tenant_id: Optional[int] = None
    platform_id: Optional[int] = None
    serial: Optional[str] = Field(None, max_length=50)
    asset_tag: Optional[str] = Field(None, max_length=50)
    site_id: int
    location_id: Optional[int] = None
    rack_id: Optional[int] = None # Assuming Rack model exists
    position: Optional[int] = None
    face: Optional[str] = None # e.g., 'front', 'rear'
    primary_ip4_id: Optional[int] = None
    primary_ip6_id: Optional[int] = None
    cluster_id: Optional[int] = None # Assuming Cluster model exists
    virtual_chassis_id: Optional[int] = None # Assuming VirtualChassis model exists
    vc_position: Optional[int] = None
    vc_priority: Optional[int] = None
    status: str = Field(..., max_length=50)
    comments: Optional[str] = None
    custom_fields: Optional[Dict[str, Any]] = None

class DeviceCreate(DeviceBase):
    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "name": "core-router-01",
                "device_type_id": 1,
                "role_id": 1,
                "tenant_id": 1,
                "platform_id": 1,
                "serial": "SNABC123",
                "asset_tag": "ASSET123",
                "site_id": 1,
                "location_id": 1,
                "rack_id": 1,
                "position": 10,
                "face": "front",
                "primary_ip4_id": None, # Cannot know this ID beforehand
                "primary_ip6_id": None,
                "cluster_id": None,
                "virtual_chassis_id": None,
                "vc_position": None,
                "vc_priority": None,
                "status": "active",
                "comments": "Main core router for NYC site.",
                "custom_fields": {"purchase_date": "2023-01-15"}
            }
        }
    )

class DeviceUpdate(DeviceBase):
    name: Optional[str] = None
    device_type_id: Optional[int] = None
    role_id: Optional[int] = None
    tenant_id: Optional[int] = None
    platform_id: Optional[int] = None
    serial: Optional[str] = None
    asset_tag: Optional[str] = None
    site_id: Optional[int] = None
    location_id: Optional[int] = None
    rack_id: Optional[int] = None
    position: Optional[int] = None
    face: Optional[str] = None
    primary_ip4_id: Optional[int] = None
    primary_ip6_id: Optional[int] = None
    cluster_id: Optional[int] = None
    virtual_chassis_id: Optional[int] = None
    vc_position: Optional[int] = None
    vc_priority: Optional[int] = None
    status: Optional[str] = None
    comments: Optional[str] = None
    custom_fields: Optional[Dict[str, Any]] = None

class DeviceRead(DeviceBase):
    id: int
    created_at: datetime
    updated_at: Optional[datetime] = None
    # device_type: DeviceTypeRead # Assuming DeviceTypeRead exists
    # role: RoleRead
    # tenant: Optional[TenantRead] = None
    # platform: Optional[PlatformRead] # Assuming PlatformRead exists
    # site: SiteRead
    # location: Optional[LocationRead] = None
    # rack: Optional[RackRead] = None
    # primary_ip4: Optional[IPAddressRead] = None
    # primary_ip6: Optional[IPAddressRead] = None
    # cluster: Optional[ClusterRead] = None
    # virtual_chassis: Optional[VirtualChassisRead] = None
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

# DeviceInventory
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
