from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import inspect 
from sqlmodel import Session  # Use sqlmodel Session instead of sqlalchemy.orm
from typing import List, Dict, Any
from uuid import UUID

from . import crud_router
from .. import crud_legacy as crud
from ..database import get_session, engine 
from ..models import (
    Region, SiteGroup, Site, Location, RIR, Aggregate, Role,
    Prefix, IPRange, IPAddress, Tenant, Interface, VLAN,
    VLANGroup, ASN, ASNRange, Credential,
    PlatformType, NetJob, DeviceInventory 
)
from ..models.vrf import VRF, RouteTarget

# Import schema modules
from app.schemas import (
    organizational,
    vrf,
    ipam,
    tenancy,
    bgp,
    credentials,
    platform,
    automation
)

# Import directly from devices schema to avoid the missing module error
try:
    # Use optional import for these modules that might not exist
    from app.schemas.devices import DeviceInventoryRead, InterfaceRead, DeviceInventoryCreate, DeviceInventoryUpdate, InterfaceCreate, InterfaceUpdate
except ImportError:
    # If the import fails, we'll need to skip these routes
    DeviceInventoryRead = None
    InterfaceRead = None
    DeviceInventoryCreate = None 
    DeviceInventoryUpdate = None
    InterfaceCreate = None
    InterfaceUpdate = None

# Import necessary Read schemas
from app.schemas.organizational import (
    RegionRead, SiteGroupRead, SiteRead, LocationRead
)
from app.schemas.vrf import VRFReadWithTargets, RouteTargetRead
from app.schemas.ipam import (
    RIRRead, AggregateRead, RoleRead, PrefixRead,
    IPRangeRead, IPAddressRead, VLANRead, VLANGroupRead
)
from app.schemas.tenancy import TenantRead
from app.schemas.bgp import ASNRead, ASNRangeRead
from app.schemas.credentials import CredentialRead
from app.schemas.platform import PlatformTypeRead
from app.schemas.automation import NetJobRead

router = APIRouter(prefix="/api/v1")

# The endpoints module might not be properly imported. Check if it exists and import it if needed
try:
    from . import endpoints
    router.include_router(endpoints.router, tags=["Specialized Operations"])
except ImportError:
    pass

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
    },
    "device_inventory": {
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

# Define device inventory handlers only if DeviceInventoryRead is available
if DeviceInventoryRead:
    @router.get(
        "/device_inventory/{device_uuid}",
        response_model=List[DeviceInventoryRead],
        tags=["Device Inventory"]
    )
    def read_device_inventory_by_device(
        device_uuid: UUID,
        session: Session = Depends(get_session)
    ): 
        inventory_list = crud.device_inventory.get_by_device_uuid(session=session, device_uuid=device_uuid)
        return inventory_list

    @router.delete(
        "/device_inventory/{device_uuid}",
        status_code=200,
        tags=["Device Inventory"]
    )
    def delete_device_inventory_by_device(
        device_uuid: UUID,
        session: Session = Depends(get_session)
    ) -> dict:
        # Since Device model no longer exists, we directly remove inventory by device_uuid
        num_deleted = crud.device_inventory.remove_by_device_uuid(session=session, device_uuid=device_uuid)
        return {"message": "Device inventory deleted successfully", "deleted_count": num_deleted}

# Organizational Routes
crud_router.create_crud_routes(router, "regions", crud.region, crud.region, Region, organizational.RegionCreate, organizational.RegionUpdate, ReadSchema=organizational.RegionRead, tags=["Regions"])
crud_router.create_crud_routes(router, "site_groups", crud.site_group, crud.site_group, SiteGroup, organizational.SiteGroupCreate, organizational.SiteGroupUpdate, ReadSchema=organizational.SiteGroupRead, tags=["Site Groups"])
crud_router.create_crud_routes(router, "sites", crud.site, crud.site, Site, organizational.SiteCreate, organizational.SiteUpdate, ReadSchema=organizational.SiteRead, tags=["Sites"])
crud_router.create_crud_routes(router, "locations", crud.location, crud.location, Location, organizational.LocationCreate, organizational.LocationUpdate, ReadSchema=organizational.LocationRead, tags=["Locations"])

# IPAM Routes
crud_router.create_crud_routes(router, "rirs", crud.rir, crud.rir, RIR, ipam.RIRCreate, ipam.RIRUpdate, ReadSchema=ipam.RIRRead, tags=["RIRs"])
crud_router.create_crud_routes(router, "aggregates", crud.aggregate, crud.aggregate, Aggregate, ipam.AggregateCreate, ipam.AggregateUpdate, ReadSchema=ipam.AggregateRead, tags=["Aggregates"])
crud_router.create_crud_routes(router, "vrfs", crud.vrf, crud.vrf, VRF, vrf.VRFCreate, vrf.VRFUpdate, ReadSchema=vrf.VRFReadWithTargets, tags=["VRFs"])
crud_router.create_crud_routes(router, "route_targets", crud.route_target, crud.route_target, RouteTarget, vrf.RouteTargetCreate, vrf.RouteTargetUpdate, ReadSchema=vrf.RouteTargetRead, tags=["Route Targets"])
crud_router.create_crud_routes(router, "roles", crud.role, crud.role, Role, ipam.RoleCreate, ipam.RoleUpdate, ReadSchema=ipam.RoleRead, tags=["Roles"])
crud_router.create_crud_routes(router, "prefixes", crud.prefix, crud.prefix, Prefix, ipam.PrefixCreate, ipam.PrefixUpdate, ReadSchema=ipam.PrefixRead, tags=["Prefixes"])
crud_router.create_crud_routes(router, "ip_ranges", crud.ip_range, crud.ip_range, IPRange, ipam.IPRangeCreate, ipam.IPRangeUpdate, ReadSchema=ipam.IPRangeRead, tags=["IP Ranges"])
crud_router.create_crud_routes(router, "ip_addresses", crud.ip_address, crud.ip_address, IPAddress, ipam.IPAddressCreate, ipam.IPAddressUpdate, ReadSchema=ipam.IPAddressRead, tags=["IP Addresses"])
crud_router.create_crud_routes(router, "vlans", crud.vlan, crud.vlan, VLAN, ipam.VLANCreate, ipam.VLANUpdate, ReadSchema=ipam.VLANRead, tags=["VLANs"])
crud_router.create_crud_routes(router, "vlan_groups", crud.vlan_group, crud.vlan_group, VLANGroup, ipam.VLANGroupCreate, ipam.VLANGroupUpdate, ReadSchema=ipam.VLANGroupRead, tags=["VLAN Groups"])

# Tenancy Routes
crud_router.create_crud_routes(router, "tenants", crud.tenant, crud.tenant, Tenant, tenancy.TenantCreate, tenancy.TenantUpdate, ReadSchema=tenancy.TenantRead, tags=["Tenants"])

# Interface Routes - only create if schema classes are available
if InterfaceCreate and InterfaceUpdate and InterfaceRead:
    crud_router.create_crud_routes(router, "interfaces", crud.interface, crud.interface, Interface, InterfaceCreate, InterfaceUpdate, ReadSchema=InterfaceRead, tags=["Interfaces"])

# Device Inventory Routes - only create if schema classes are available
if DeviceInventoryCreate and DeviceInventoryUpdate and DeviceInventoryRead:
    crud_router.create_crud_routes(router, "device_inventory", crud.device_inventory, crud.device_inventory, DeviceInventory, DeviceInventoryCreate, DeviceInventoryUpdate, ReadSchema=DeviceInventoryRead, tags=["Device Inventory"])

# BGP Routes
crud_router.create_crud_routes(router, "asns", crud.asn, crud.asn, ASN, bgp.ASNCreate, bgp.ASNUpdate, ReadSchema=bgp.ASNRead, tags=["ASNs"])
crud_router.create_crud_routes(router, "asn_ranges", crud.asn_range, crud.asn_range, ASNRange, bgp.ASNRangeCreate, bgp.ASNRangeUpdate, ReadSchema=bgp.ASNRangeRead, tags=["ASN Ranges"])

# Credential Routes
crud_router.create_crud_routes(router, "credentials", crud.credential, crud.credential, Credential, credentials.CredentialCreate, credentials.CredentialUpdate, ReadSchema=credentials.CredentialRead, tags=["Credentials"])

# Platform Routes
crud_router.create_crud_routes(router, "platform_types", crud.platform_type, crud.platform_type, PlatformType, platform.PlatformTypeCreate, platform.PlatformTypeUpdate, ReadSchema=platform.PlatformTypeRead, tags=["Platform Types"])

# Automation Routes
crud_router.create_crud_routes(router, "net_jobs", crud.net_job, crud.net_job, NetJob, automation.NetJobCreate, automation.NetJobUpdate, ReadSchema=automation.NetJobRead, tags=["Net Jobs"])

# Include specialized endpoints router (e.g., for connection details) if available
try:
    from . import endpoints
    router.include_router(endpoints.router, tags=["Specialized Operations"])
except (ImportError, AttributeError):
    # Endpoints module might not be available or might not have a router attribute
    pass

# Include authentication router from endpoints - using absolute import path
try:
    from app.api.endpoints.auth import router as auth_router
    # Don't include the auth router here, it's already included in endpoints/__init__.py
    import logging
    logging.getLogger(__name__).info("Authentication router imported successfully")
except ImportError as e:
    # Log error or warning that authentication router wasn't included
    import logging
    logging.getLogger(__name__).warning(f"Authentication router could not be imported: {e}")
