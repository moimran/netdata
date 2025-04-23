from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import inspect 
from sqlalchemy.orm import Session
from typing import List, Dict, Any
from uuid import UUID

from . import crud_router
from . import endpoints
from .. import crud
from ..database import get_session, engine 
from ..models import (
    Region, SiteGroup, Site, Location, VRF, RIR, Aggregate, Role,
    Prefix, IPRange, IPAddress, Tenant, Device, Interface, VLAN,
    VLANGroup, ASN, ASNRange, RouteTarget, Credential,
    PlatformType, NetJob, DeviceInventory 
)

from app.schemas import (
    organizational,
    ipam,
    tenancy,
    devices,
    bgp,
    credentials,
    platform,
    automation
)

router = APIRouter(prefix="/api/v1")

router.include_router(endpoints.router, tags=["Specialized Operations"])

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
    'vlan_groups': VLANGroup,
    'asns': ASN,
    'asn_ranges': ASNRange,
    'route_targets': RouteTarget,
    'credentials': Credential,
    'platform_types': PlatformType,
    'net_jobs': NetJob,
    'device_inventory': DeviceInventory
}

reference_mappings = {
    "sites": {
        "region_id": (Region, crud.region, "name"),
        "site_group_id": (SiteGroup, crud.site_group, "name"),
        "tenant_id": (Tenant, crud.tenant, "name"),
        "asn_id": (ASN, crud.asn, "asn")
    },
    "locations": {
        "site_id": (Site, crud.site, "name"),
        "parent_id": (Location, crud.location, "name"),
        "tenant_id": (Tenant, crud.tenant, "name")
    },
    "prefixes": {
        "site_id": (Site, crud.site, "name"),
        "vrf_id": (VRF, crud.vrf, "name"),
        "tenant_id": (Tenant, crud.tenant, "name"),
        "vlan_id": (VLAN, crud.vlan, "name"),
        "role_id": (Role, crud.role, "name")
    },
    "ip_addresses": {
        "interface_id": (Interface, crud.interface, "name"),
        "tenant_id": (Tenant, crud.tenant, "name"),
        "vrf_id": (VRF, crud.vrf, "name")
    },
    "ip_ranges": {
        "tenant_id": (Tenant, crud.tenant, "name"),
        "vrf_id": (VRF, crud.vrf, "name"),
        "role_id": (Role, crud.role, "name")
    },
    "aggregates": {
        "rir_id": (RIR, crud.rir, "name"),
        "tenant_id": (Tenant, crud.tenant, "name")
    },
    "interfaces": {
        "device_id": (Device, crud.device, "name"),
        "parent_id": (Interface, crud.interface, "name"),
        "untagged_vlan_id": (VLAN, crud.vlan, "name")
    },
    "vlans": {
        "site_id": (Site, crud.site, "name"),
        "tenant_id": (Tenant, crud.tenant, "name"),
        "role_id": (Role, crud.role, "name"),
        "group_id": (VLANGroup, crud.vlan_group, "name")
    },
    "vlan_groups": {
    },
    "devices": {
        "role_id": (Role, crud.role, "name"),
        "tenant_id": (Tenant, crud.tenant, "name"),
        "platform_id": (PlatformType, crud.platform_type, "platform_type"),
        "site_id": (Site, crud.site, "name"),
        "location_id": (Location, crud.location, "name"),
        "primary_ip4_id": (IPAddress, crud.ip_address, "address"),
        "primary_ip6_id": (IPAddress, crud.ip_address, "address")
    },
    "asns": {
        "rir_id": (RIR, crud.rir, "name"),
        "tenant_id": (Tenant, crud.tenant, "name")
    },
    "asn_ranges": {
        "rir_id": (RIR, crud.rir, "name"),
        "tenant_id": (Tenant, crud.tenant, "name")
    },
    "route_targets": {
        "tenant_id": (Tenant, crud.tenant, "name")
    },
    "credentials": {
    },
    "net_jobs": {
        "device_id": (Device, crud.device, "name")
    },
    "device_inventory": {
        "device_id": (Device, crud.device, "name")
    }
}

@router.get("/schema/{table_name}", tags=["Schema Information"])
def get_table_schema(table_name: str) -> Dict[str, Any]:
    if table_name not in model_mapping:
        raise HTTPException(status_code=404, detail=f"Table {table_name} not found")
    try:
        inspector = inspect(engine)
        columns = inspector.get_columns(table_name)
        foreign_keys = inspector.get_foreign_keys(table_name)
        schema = {
            "table_name": table_name,
            "columns": [],
            "foreign_keys": []
        }
        for column in columns:
            col_info = {
                "name": column["name"],
                "type": str(column["type"]),
                "nullable": column["nullable"],
                "default": str(column["default"]) if column["default"] is not None else None,
                "primary_key": column.get("primary_key", False)
            }
            schema["columns"].append(col_info)
        for fk in foreign_keys:
            fk_info = {
                "constrained_columns": fk["constrained_columns"],
                "referred_table": fk["referred_table"],
                "referred_columns": fk["referred_columns"]
            }
            schema["foreign_keys"].append(fk_info)
        return schema 
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error getting schema for {table_name}: {str(e)}")

@router.get("/reference/{table_name}/{field_name}", tags=["Schema Information"])
def get_reference_options(table_name: str, field_name: str, db: Session = Depends(get_session)) -> List[Dict[str, Any]]:
    if table_name not in reference_mappings:
        raise HTTPException(status_code=404, detail=f"No reference mappings defined for table {table_name}")
    if field_name not in reference_mappings[table_name]:
        return []

    try:
        ref_model, crud_instance, display_field = reference_mappings[table_name][field_name]

        options = crud_instance.get_multi(db=db, skip=0, limit=1000) 

        formatted_options = []
        for option in options:
            display_value = getattr(option, display_field, f"ID: {option.id}")
            formatted_options.append({
                "id": option.id,
                "label": str(display_value) 
            })
        return formatted_options
    except AttributeError as e:
         raise HTTPException(status_code=500, detail=f"Configuration error for {table_name}.{field_name}: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error getting reference options for {table_name}.{field_name}: {str(e)}")

@router.get("/all-tables", tags=["Schema Information"])
def get_all_tables() -> Dict[str, str]:
    try:
        tables = list(model_mapping.keys())
        base_url = "/api/v1" 
        urls = {table: f"{base_url}/{table}" for table in tables}
        return urls
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error getting tables: {str(e)}")

@router.get(
    "/device_inventory/{device_uuid}",
    response_model=List[devices.DeviceInventoryRead],
    tags=["Device Inventory"]
)
def read_device_inventory_by_device(
    device_uuid: UUID,
    db: Session = Depends(get_session)
) -> List[devices.DeviceInventoryRead]: 
    inventory_list = crud.device_inventory.get_by_device_uuid(db=db, device_uuid=device_uuid)
    return inventory_list

@router.delete(
    "/device_inventory/{device_uuid}",
    status_code=200,
    tags=["Device Inventory"]
)
def delete_device_inventory_by_device(
    device_uuid: UUID,
    db: Session = Depends(get_session)
) -> dict:
    deleted_count = crud.device_inventory.remove_by_device_uuid(db=db, device_uuid=device_uuid)
    return {"message": "Device inventory deleted successfully", "deleted_count": deleted_count}

crud_router.create_crud_routes(router, "regions", crud.region, Region, organizational.RegionCreate, organizational.RegionUpdate, tags=["Regions"])
crud_router.create_crud_routes(router, "site_groups", crud.site_group, SiteGroup, organizational.SiteGroupCreate, organizational.SiteGroupUpdate, tags=["Site Groups"])
crud_router.create_crud_routes(router, "sites", crud.site, Site, organizational.SiteCreate, organizational.SiteUpdate, tags=["Sites"])
crud_router.create_crud_routes(router, "locations", crud.location, Location, organizational.LocationCreate, organizational.LocationUpdate, tags=["Locations"])
crud_router.create_crud_routes(router, "vrfs", crud.vrf, VRF, ipam.VRFCreate, ipam.VRFUpdate, tags=["VRFs"])
crud_router.create_crud_routes(router, "rirs", crud.rir, RIR, ipam.RIRCreate, ipam.RIRUpdate, tags=["RIRs"])
crud_router.create_crud_routes(router, "aggregates", crud.aggregate, Aggregate, ipam.AggregateCreate, ipam.AggregateUpdate, tags=["Aggregates"])
crud_router.create_crud_routes(router, "roles", crud.role, Role, ipam.RoleCreate, ipam.RoleUpdate, tags=["Roles"])
crud_router.create_crud_routes(router, "prefixes", crud.prefix, Prefix, ipam.PrefixCreate, ipam.PrefixUpdate, tags=["Prefixes"])
crud_router.create_crud_routes(router, "ip_ranges", crud.ip_range, IPRange, ipam.IPRangeCreate, ipam.IPRangeUpdate, tags=["IP Ranges"])
crud_router.create_crud_routes(router, "ip_addresses", crud.ip_address, IPAddress, ipam.IPAddressCreate, ipam.IPAddressUpdate, tags=["IP Addresses"])
crud_router.create_crud_routes(router, "tenants", crud.tenant, Tenant, tenancy.TenantCreate, tenancy.TenantUpdate, tags=["Tenants"])
crud_router.create_crud_routes(router, "devices", crud.device, Device, devices.DeviceCreate, devices.DeviceUpdate, tags=["Devices"])
crud_router.create_crud_routes(router, "interfaces", crud.interface, Interface, devices.InterfaceCreate, devices.InterfaceUpdate, tags=["Interfaces"])
crud_router.create_crud_routes(router, "vlans", crud.vlan, VLAN, ipam.VLANCreate, ipam.VLANUpdate, tags=["VLANs"])
crud_router.create_crud_routes(router, "vlan_groups", crud.vlan_group, VLANGroup, ipam.VLANGroupCreate, ipam.VLANGroupUpdate, tags=["VLAN Groups"])
crud_router.create_crud_routes(router, "asns", crud.asn, ASN, bgp.ASNCreate, bgp.ASNUpdate, tags=["ASNs"])
crud_router.create_crud_routes(router, "asn_ranges", crud.asn_range, ASNRange, bgp.ASNRangeCreate, bgp.ASNRangeUpdate, tags=["ASN Ranges"])
crud_router.create_crud_routes(router, "route_targets", crud.route_target, RouteTarget, bgp.RouteTargetCreate, bgp.RouteTargetUpdate, tags=["Route Targets"])
crud_router.create_crud_routes(router, "credentials", crud.credential, Credential, credentials.CredentialCreate, credentials.CredentialUpdate, tags=["Credentials"])
crud_router.create_crud_routes(router, "platform_types", crud.platform_type, PlatformType, platform.PlatformTypeCreate, platform.PlatformTypeUpdate, tags=["Platform Types"])
crud_router.create_crud_routes(router, "net_jobs", crud.net_job, NetJob, automation.NetJobCreate, automation.NetJobUpdate, tags=["Net Jobs"])
crud_router.create_crud_routes(router, "device_inventory", crud.device_inventory, DeviceInventory, devices.DeviceInventoryCreate, devices.DeviceInventoryUpdate, tags=["Device Inventory"])
