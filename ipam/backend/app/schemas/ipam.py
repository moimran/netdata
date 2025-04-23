# Schemas for Core IPAM Models (VRF, RIR, Aggregate, Role, Prefix, IPRange, IPAddress, VLAN, VLANGroup)

from typing import Optional, Dict, Any
from datetime import datetime
from pydantic import BaseModel, Field, ConfigDict

# VRF
class VRFBase(BaseModel):
    name: str = Field(..., max_length=100)
    rd: Optional[str] = Field(None, max_length=50)
    tenant_id: Optional[int] = None
    enforce_unique: bool = True
    description: Optional[str] = None
    custom_fields: Optional[Dict[str, Any]] = None

class VRFCreate(VRFBase):
    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "name": "Customer-A-VRF",
                "rd": "65000:100",
                "tenant_id": 1,
                "enforce_unique": True,
                "description": "VRF for Customer A",
                "custom_fields": {"sla": "gold"}
            }
        }
    )

class VRFUpdate(VRFBase):
    name: Optional[str] = None
    rd: Optional[str] = None
    tenant_id: Optional[int] = None
    enforce_unique: Optional[bool] = None
    description: Optional[str] = None
    custom_fields: Optional[Dict[str, Any]] = None

class VRFRead(VRFBase):
    id: int
    created_at: datetime
    updated_at: Optional[datetime] = None
    # tenant: Optional[TenantRead] = None
    # import_targets: List[RouteTargetRead] = []
    # export_targets: List[RouteTargetRead] = []
    class Config:
        from_attributes = True

# RIR
class RIRBase(BaseModel):
    name: str = Field(..., max_length=100)
    slug: Optional[str] = Field(None, max_length=100)
    is_private: bool = False
    description: Optional[str] = None

class RIRCreate(RIRBase):
    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "name": "ARIN",
                "slug": "arin",
                "is_private": False,
                "description": "American Registry for Internet Numbers"
            }
        }
    )

class RIRUpdate(RIRBase):
    name: Optional[str] = None
    slug: Optional[str] = None
    is_private: Optional[bool] = None
    description: Optional[str] = None

class RIRRead(RIRBase):
    id: int
    class Config:
        from_attributes = True

# Aggregate
class AggregateBase(BaseModel):
    name: str = Field(..., max_length=100)
    slug: Optional[str] = Field(None, max_length=100)
    prefix: str # Handled by validator in model
    rir_id: int
    tenant_id: Optional[int] = None
    date_added: Optional[datetime] = None
    description: Optional[str] = None
    custom_fields: Optional[Dict[str, Any]] = None

class AggregateCreate(AggregateBase):
    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "name": "RFC1918 Private Space",
                "slug": "rfc1918-private-space",
                "prefix": "10.0.0.0/8",
                "rir_id": 1, # Assuming 1 is a private RIR
                "tenant_id": None,
                "date_added": None, # Often set automatically
                "description": "RFC1918 Private Space",
                "custom_fields": {"allocation_source": "Internal"}
            }
        }
    )

class AggregateUpdate(AggregateBase):
    prefix: Optional[str] = None
    rir_id: Optional[int] = None
    tenant_id: Optional[int] = None
    date_added: Optional[datetime] = None
    description: Optional[str] = None
    custom_fields: Optional[Dict[str, Any]] = None

class AggregateRead(AggregateBase):
    id: int
    created_at: datetime
    updated_at: Optional[datetime] = None
    # rir: RIRRead
    # tenant: Optional[TenantRead] = None
    class Config:
        from_attributes = True

# Role (Prefix/VLAN Role)
class RoleBase(BaseModel):
    name: str = Field(..., max_length=100)
    slug: Optional[str] = Field(None, max_length=100)
    weight: int = 1000
    description: Optional[str] = None

class RoleCreate(RoleBase):
    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "name": "Server Subnet",
                "slug": "server-subnet",
                "weight": 100,
                "description": "Subnets allocated for servers"
            }
        }
    )

class RoleUpdate(RoleBase):
    name: Optional[str] = None
    slug: Optional[str] = None
    weight: Optional[int] = None
    description: Optional[str] = None

class RoleRead(RoleBase):
    id: int
    class Config:
        from_attributes = True

# Prefix
class PrefixBase(BaseModel):
    prefix: str # Handled by validator in model
    site_id: Optional[int] = None
    vrf_id: Optional[int] = None
    tenant_id: Optional[int] = None
    vlan_id: Optional[int] = None
    status: str = Field(..., max_length=50)
    role_id: Optional[int] = None
    is_pool: bool = False
    is_critical: bool = False
    description: Optional[str] = None
    comments: Optional[str] = None
    custom_fields: Optional[Dict[str, Any]] = None

class PrefixCreate(PrefixBase):
    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "prefix": "192.168.1.0/24",
                "site_id": 1,
                "vrf_id": 1,
                "tenant_id": 1,
                "vlan_id": 10,
                "status": "active",
                "role_id": 1, # Assuming 1 is 'Server Subnet'
                "is_pool": False,
                "is_critical": False,
                "description": "Office LAN Subnet",
                "comments": "Standard user network",
                "custom_fields": {"dhcp_scope": "192.168.1.100-200"}
            }
        }
    )

class PrefixUpdate(PrefixBase):
    prefix: Optional[str] = None
    site_id: Optional[int] = None
    vrf_id: Optional[int] = None
    tenant_id: Optional[int] = None
    vlan_id: Optional[int] = None
    status: Optional[str] = None
    role_id: Optional[int] = None
    is_pool: Optional[bool] = None
    is_critical: Optional[bool] = None
    description: Optional[str] = None
    comments: Optional[str] = None
    custom_fields: Optional[Dict[str, Any]] = None

class PrefixRead(PrefixBase):
    id: int
    created_at: datetime
    updated_at: Optional[datetime] = None
    # site: Optional[SiteRead] = None
    # vrf: Optional[VRFRead] = None
    # tenant: Optional[TenantRead] = None
    # vlan: Optional[VLANRead] = None
    # role: Optional[RoleRead] = None
    class Config:
        from_attributes = True

# IPRange
class IPRangeBase(BaseModel):
    start_address: str # Handled by validator in model
    end_address: str   # Handled by validator in model
    size: Optional[int] = None # Calculated potentially
    prefix_id: Optional[int] = None # If associated with a specific Prefix
    vrf_id: Optional[int] = None
    tenant_id: Optional[int] = None
    status: str = Field(..., max_length=50)
    role_id: Optional[int] = None
    description: Optional[str] = None
    comments: Optional[str] = None
    custom_fields: Optional[Dict[str, Any]] = None

class IPRangeCreate(IPRangeBase):
    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "start_address": "192.168.1.100",
                "end_address": "192.168.1.200",
                "size": 101, # This might be auto-calculated
                "prefix_id": 1, # Assuming prefix 1 is 192.168.1.0/24
                "vrf_id": 1,
                "tenant_id": 1,
                "status": "active",
                "role_id": 2, # Assuming 2 is 'DHCP Pool'
                "description": "DHCP allocation range for Office LAN",
                "comments": "Reserved for dynamic assignment",
                "custom_fields": {"lease_time": 86400}
            }
        }
    )

class IPRangeUpdate(IPRangeBase):
    start_address: Optional[str] = None
    end_address: Optional[str] = None
    prefix_id: Optional[int] = None
    vrf_id: Optional[int] = None
    tenant_id: Optional[int] = None
    status: Optional[str] = None
    role_id: Optional[int] = None
    description: Optional[str] = None
    comments: Optional[str] = None
    custom_fields: Optional[Dict[str, Any]] = None

class IPRangeRead(IPRangeBase):
    id: int
    created_at: datetime
    updated_at: Optional[datetime] = None
    # prefix: Optional[PrefixRead] = None
    # vrf: Optional[VRFRead] = None
    # tenant: Optional[TenantRead] = None
    # role: Optional[RoleRead] = None
    class Config:
        from_attributes = True

# IPAddress
class IPAddressBase(BaseModel):
    address: str # Handled by validator in model
    vrf_id: Optional[int] = None
    tenant_id: Optional[int] = None
    status: str = Field(..., max_length=50)
    role: Optional[str] = Field(None, max_length=50) # e.g., Loopback, Secondary
    interface_id: Optional[int] = None
    dns_name: Optional[str] = Field(None, max_length=255)
    description: Optional[str] = None
    comments: Optional[str] = None
    custom_fields: Optional[Dict[str, Any]] = None

class IPAddressCreate(IPAddressBase):
    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "address": "192.168.1.1/24", # Address with mask
                "vrf_id": 1,
                "tenant_id": 1,
                "status": "active",
                "role": "VIP",
                "interface_id": 5, # Assuming interface 5 exists
                "dns_name": "gateway.office.example.com",
                "description": "Default Gateway for Office LAN",
                "comments": "Primary router interface IP",
                "custom_fields": {"monitored": True}
            }
        }
    )

class IPAddressUpdate(IPAddressBase):
    address: Optional[str] = None
    vrf_id: Optional[int] = None
    tenant_id: Optional[int] = None
    status: Optional[str] = None
    role: Optional[str] = None
    interface_id: Optional[int] = None
    dns_name: Optional[str] = None
    description: Optional[str] = None
    comments: Optional[str] = None
    custom_fields: Optional[Dict[str, Any]] = None

class IPAddressRead(IPAddressBase):
    id: int
    created_at: datetime
    updated_at: Optional[datetime] = None
    # vrf: Optional[VRFRead] = None
    # tenant: Optional[TenantRead] = None
    # interface: Optional[InterfaceRead] = None
    class Config:
        from_attributes = True

# VLAN
class VLANBase(BaseModel):
    site_id: Optional[int] = None
    group_id: Optional[int] = None
    vid: int = Field(..., ge=1, le=4094)
    name: str = Field(..., max_length=64)
    tenant_id: Optional[int] = None
    status: str = Field(..., max_length=50)
    role_id: Optional[int] = None
    description: Optional[str] = None
    comments: Optional[str] = None
    custom_fields: Optional[Dict[str, Any]] = None

class VLANCreate(VLANBase):
    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "site_id": 1,
                "group_id": 1, # Assuming VLAN group 1 exists
                "vid": 10,
                "name": "OFFICE-LAN",
                "tenant_id": 1,
                "status": "active",
                "role_id": 1, # Assuming role 1 is 'User Network'
                "description": "Primary User VLAN for NYC Office",
                "comments": "Standard wired user access",
                "custom_fields": {"qos_policy": "default"}
            }
        }
    )

class VLANUpdate(VLANBase):
    site_id: Optional[int] = None
    group_id: Optional[int] = None
    vid: Optional[int] = None
    name: Optional[str] = None
    tenant_id: Optional[int] = None
    status: Optional[str] = None
    role_id: Optional[int] = None
    description: Optional[str] = None
    comments: Optional[str] = None
    custom_fields: Optional[Dict[str, Any]] = None

class VLANRead(VLANBase):
    id: int
    created_at: datetime
    updated_at: Optional[datetime] = None
    # site: Optional[SiteRead] = None
    # group: Optional[VLANGroupRead] = None
    # tenant: Optional[TenantRead] = None
    # role: Optional[RoleRead] = None
    class Config:
        from_attributes = True

# VLANGroup
class VLANGroupBase(BaseModel):
    name: str = Field(..., max_length=100)
    slug: Optional[str] = Field(None, max_length=100)
    scope_type: Optional[str] = Field(None, max_length=50) # e.g., 'dcim.site', 'dcim.location'
    scope_id: Optional[int] = None
    min_vid: Optional[int] = Field(None, ge=1, le=4094)
    max_vid: Optional[int] = Field(None, ge=1, le=4094)
    description: Optional[str] = None

class VLANGroupCreate(VLANGroupBase):
    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "name": "NYC Office VLANs",
                "slug": "nyc-office-vlans",
                "scope_type": "site",
                "scope_id": 1, # Assuming site ID 1 is NYC
                "min_vid": 10,
                "max_vid": 99,
                "description": "VLANs specific to the NYC Office site"
            }
        }
    )

class VLANGroupUpdate(VLANGroupBase):
    name: Optional[str] = None
    slug: Optional[str] = None
    scope_type: Optional[str] = None
    scope_id: Optional[int] = None
    min_vid: Optional[int] = None
    max_vid: Optional[int] = None
    description: Optional[str] = None

class VLANGroupRead(VLANGroupBase):
    id: int
    created_at: datetime
    updated_at: Optional[datetime] = None
    # scope: GenericForeignKey equivalent? Needs thought.
    class Config:
        from_attributes = True
