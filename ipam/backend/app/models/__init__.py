"""
IPAM Models package
"""
# Base and utility models first
from .base import BaseModel
from .fields import IPNetworkType, IPNetworkField, ASNField, DNSNameField
from .ip_constants import PrefixStatusEnum, IPRangeStatusEnum, IPAddressStatusEnum, IPAddressRoleEnum
from .ip_utils import (
    validate_ip_network,
    calculate_ip_range_size,
    get_available_ips,
    calculate_prefix_utilization
)

# Core models - order matters due to relationships
from .region import Region
from .site_group import SiteGroup
from .rir import RIR
from .aggregate import Aggregate
from .asn import ASN, ASNRange
from .tenant import Tenant
from .role import Role
from .vrf import VRF, RouteTarget, VRFImportTargets, VRFExportTargets
from .site import Site
from .location import Location
from .vlan import VLAN, VLANGroup, VLANStatusEnum
from .ip_prefix import Prefix, IPRange
from .ip_address import IPAddress
from .credential import Credential
from .device import Device
from .interface import Interface

__all__ = [
    # Base and Fields
    "BaseModel",
    "IPNetworkType",
    "IPNetworkField",
    "ASNField",
    "DNSNameField",
    
    # Utilities
    "validate_ip_network",
    "calculate_ip_range_size",
    "get_available_ips",
    "calculate_prefix_utilization",
    
    # Core models
    "Region",
    "SiteGroup",
    "RIR",
    "Aggregate",
    "ASN",
    "ASNRange",
    "Tenant",
    "Role",
    "VRF",
    "RouteTarget",
    "VRFImportTargets", 
    "VRFExportTargets",
    "Site",
    "Location",
    "VLAN",
    "VLANGroup",
    "VLANStatusEnum",
    "Prefix",
    "IPRange",
    "PrefixStatusEnum",
    "IPRangeStatusEnum",
    "IPAddressStatusEnum",
    "IPAddressRoleEnum",
    "IPAddress",
    "Device",
    "Interface",
    "Credential"
]
