from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session
from typing import Dict, Any, List

from ...database import get_session
from ...models import (
    Region, SiteGroup, Site, Location, VRF, RIR, Aggregate, Role, 
    Prefix, IPRange, IPAddress, Tenant, Interface, VLAN, VLANGroup,
    ASN, ASNRange, RouteTarget, PlatformType, DeviceInventory
)
from ... import crud_legacy as crud

router = APIRouter()

# Define reference mappings for dropdown options
reference_mappings = {
    "regions": {
        "parent_id": (Region, crud.region, "name")
    },
    "site_groups": {
        "parent_id": (SiteGroup, crud.site_group, "name")
    },
    "sites": {
        "region_id": (Region, crud.region, "name"),
        "site_group_id": (SiteGroup, crud.site_group, "name"),
        "tenant_id": (Tenant, crud.tenant, "name")
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
        "untagged_vlan_id": (VLAN, crud.vlan, "name"),
        "device_id": (DeviceInventory, crud.device_inventory, "hostname")
    },
    "vlans": {
        "site_id": (Site, crud.site, "name"),
        "tenant_id": (Tenant, crud.tenant, "name"),
        "role_id": (Role, crud.role, "name"),
        "group_id": (VLANGroup, crud.vlan_group, "name")
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
    "device_inventory": {
        "platform_type_id": (PlatformType, crud.platform_type, "platform_type"),
        "tenant_id": (Tenant, crud.tenant, "name"),
        "site_id": (Site, crud.site, "name"),
        "location_id": (Location, crud.location, "name")
    },
    "arp_table": {
        "device_id": (DeviceInventory, crud.device_inventory, "hostname")
    }
}

@router.get("/reference/{table_name}/{field_name}", tags=["Reference Data"])
def get_reference_options(
    table_name: str, 
    field_name: str, 
    session: Session = Depends(get_session)
) -> List[Dict[str, Any]]:
    """
    Get reference options for dropdown fields in forms.
    """
    if table_name not in reference_mappings:
        raise HTTPException(status_code=404, detail=f"No reference mappings defined for table {table_name}")
    
    if field_name not in reference_mappings[table_name]:
        return []

    try:
        ref_model, crud_instance, display_field = reference_mappings[table_name][field_name]
        
        # Use get_all instead of get_multi to match your CRUD implementation
        options = crud_instance.get_all(session=session, skip=0, limit=1000)
        
        formatted_options = []
        for option in options:
            display_value = getattr(option, display_field, f"ID: {option.id}")
            formatted_options.append({
                "id": option.id,
                "label": str(display_value)
            })
        
        return formatted_options
    except AttributeError as e:
        raise HTTPException(
            status_code=500, 
            detail=f"Configuration error for {table_name}.{field_name}: {str(e)}"
        )
    except Exception as e:
        raise HTTPException(
            status_code=500, 
            detail=f"Error getting reference options for {table_name}.{field_name}: {str(e)}"
        )
