from fastapi import APIRouter
from . import crud_router, endpoints, schema
from .. import crud
from ..models import (
    Region, SiteGroup, Site, Location, VRF, RIR, Aggregate, Role, 
    Prefix, IPRange, IPAddress, Tenant, Device, Interface, VLAN, 
    VLANGroup, ASN, ASNRange, RouteTarget, VRFImportTargets, VRFExportTargets,
    Credential
)

# Create main API router
router = APIRouter(prefix="/api/v1")

# Add specialized endpoints
router.include_router(endpoints.router)


# Add schema endpoints
router.include_router(schema.router)

# Create routes for all models
crud_router.create_crud_routes(router, "regions", crud.region, Region)
crud_router.create_crud_routes(router, "site_groups", crud.site_group, SiteGroup)
crud_router.create_crud_routes(router, "sites", crud.site, Site)
crud_router.create_crud_routes(router, "locations", crud.location, Location)
crud_router.create_crud_routes(router, "vrfs", crud.vrf, VRF)
crud_router.create_crud_routes(router, "rirs", crud.rir, RIR)
crud_router.create_crud_routes(router, "aggregates", crud.aggregate, Aggregate)
crud_router.create_crud_routes(router, "roles", crud.role, Role)
crud_router.create_crud_routes(router, "prefixes", crud.prefix, Prefix)
crud_router.create_crud_routes(router, "ip_ranges", crud.ip_range, IPRange)
crud_router.create_crud_routes(router, "ip_addresses", crud.ip_address, IPAddress)
crud_router.create_crud_routes(router, "tenants", crud.tenant, Tenant)
crud_router.create_crud_routes(router, "devices", crud.device, Device)
crud_router.create_crud_routes(router, "interfaces", crud.interface, Interface)
crud_router.create_crud_routes(router, "vlans", crud.vlan, VLAN)
crud_router.create_crud_routes(router, "vlan_groups", crud.vlan_group, VLANGroup)
crud_router.create_crud_routes(router, "asns", crud.asn, ASN)
crud_router.create_crud_routes(router, "asn_ranges", crud.asn_range, ASNRange)
crud_router.create_crud_routes(router, "route_targets", crud.route_target, RouteTarget)
crud_router.create_crud_routes(router, "vrf_import_targets", crud.vrf_import_targets, VRFImportTargets)
crud_router.create_crud_routes(router, "vrf_export_targets", crud.vrf_export_targets, VRFExportTargets)
crud_router.create_crud_routes(router, "credentials", crud.credential, Credential)
