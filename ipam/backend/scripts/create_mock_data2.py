from datetime import datetime
from sqlmodel import Session, create_engine
import sys
import os
from typing import List

# Add the parent directory to sys.path to import app modules
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.models import (
    Site, VRF, Prefix, IPRange, Role, RouteTarget, Tenant, VLAN, RIR, ASN, ASNRange,
    Device, Interface, Location, Region, SiteGroup
)
from app.models.ip_prefix import PrefixStatusEnum, IPRangeStatusEnum

# Database connection
DATABASE_URL = "postgresql://postgres:moimran%40123@127.0.0.1:5432/ipam"
engine = create_engine(DATABASE_URL)

def create_global_tenant(session) -> Tenant:
    """Create the global tenant for the organization"""
    tenant = Tenant(
        name="Microsoft Corp",
        slug="microsoft-corp",
        description="Microsoft Corporation - Global Enterprise",
        comments="Headquartered in Redmond, WA with global operations"
    )
    session.add(tenant)
    session.commit()
    return tenant

def create_regions(session) -> List[Region]:
    """Create global regions"""
    regions = [
        Region(
            name="Americas",
            slug="americas",
            description="North and South America operations"
        ),
        Region(
            name="EMEA",
            slug="emea", 
            description="Europe, Middle East and Africa operations"
        ),
        Region(
            name="APAC",
            slug="apac",
            description="Asia Pacific operations including Australia"
        )
    ]
    session.add_all(regions)
    session.commit()
    return regions

def create_site_groups(session, regions: List[Region]) -> List[SiteGroup]:
    """Create site groups for each region"""
    groups = []
    for region in regions:
        groups.append(
            SiteGroup(
                name=f"{region.name} Data Centers",
                slug=f"{region.slug}-dcs",
                description=f"Data centers in {region.name} region"
            )
        )
        groups.append(
            SiteGroup(
                name=f"{region.name} Offices",
                slug=f"{region.slug}-offices",
                description=f"Corporate offices in {region.name} region" 
            )
        )
    session.add_all(groups)
    session.commit()
    return groups

def create_sites(session, tenant: Tenant, groups: List[SiteGroup]) -> List[Site]:
    """Create data centers and offices for each region"""
    sites = [
        # Americas Data Centers
        Site(
            name="US West 1",
            slug="us-west-1",
            description="Primary West Coast Data Center",
            facility="Quincy, WA",
            physical_address="1 Microsoft Way, Quincy, WA",
            latitude=47.2343,
            longitude=-119.8525,
            status="active",
            contact_name="John Smith",
            contact_email="john.smith@microsoft.com",
            contact_phone="+1-425-882-8080",
            tenant=tenant,
            site_group=groups[0]  # Americas DCs
        ),
        Site(
            name="US East 1",
            slug="us-east-1",
            description="Primary East Coast Data Center",
            facility="Boydton, VA",
            physical_address="1 Microsoft Way, Boydton, VA",
            latitude=36.6676,
            longitude=-78.3875,
            status="active",
            contact_name="Jane Doe",
            contact_email="jane.doe@microsoft.com",
            contact_phone="+1-434-738-3000",
            tenant=tenant,
            site_group=groups[0]
        ),
        # EMEA Data Centers
        Site(
            name="EMEA West 1",
            slug="emea-west-1",
            description="Primary EMEA Data Center",
            facility="Dublin, Ireland",
            physical_address="One Microsoft Place, Dublin",
            latitude=53.3498,
            longitude=-6.2603,
            status="active",
            contact_name="Michael Brown",
            contact_email="michael.b@microsoft.com",
            contact_phone="+353-1-706-3111",
            tenant=tenant,
            site_group=groups[2]  # EMEA DCs
        ),
        # APAC Data Centers
        Site(
            name="APAC East 1",
            slug="apac-east-1",
            description="Primary APAC Data Center",
            facility="Singapore",
            physical_address="1 Marina Boulevard, Singapore",
            latitude=1.2801,
            longitude=103.8509,
            status="active",
            contact_name="Sarah Lee",
            contact_email="sarah.lee@microsoft.com",
            contact_phone="+65-6622-1234",
            tenant=tenant,
            site_group=groups[4]  # APAC DCs
        ),
        # Corporate Offices
        Site(
            name="Redmond HQ",
            slug="redmond-hq",
            description="Microsoft Corporate Headquarters",
            facility="Redmond Campus",
            physical_address="1 Microsoft Way, Redmond, WA",
            latitude=47.6405,
            longitude=-122.1296,
            status="active",
            contact_name="Corporate IT",
            contact_email="corp.it@microsoft.com",
            contact_phone="+1-425-882-8080",
            tenant=tenant,
            site_group=groups[1]  # Americas Offices
        )
    ]
    session.add_all(sites)
    session.commit()
    return sites

def create_vrfs(session, tenant: Tenant) -> List[VRF]:
    """Create VRFs for different environments"""
    vrfs = [
        VRF(
            name="Global Production",
            slug="global-prod",
            description="Global production environment",
            rd="65000:100",
            enforce_unique=True,
            tenant=tenant
        ),
        VRF(
            name="Global Development",
            slug="global-dev",
            description="Global development environment",
            rd="65000:200",
            enforce_unique=True,
            tenant=tenant
        ),
        VRF(
            name="Global Management",
            slug="global-mgmt",
            description="Global management network",
            rd="65000:300",
            enforce_unique=True,
            tenant=tenant
        ),
        VRF(
            name="Global DMZ",
            slug="global-dmz",
            description="Global DMZ for external services",
            rd="65000:400",
            enforce_unique=True,
            tenant=tenant
        )
    ]
    session.add_all(vrfs)
    session.commit()
    return vrfs

def create_roles(session) -> List[Role]:
    """Create network roles"""
    roles = [
        Role(
            name="Production",
            slug="production",
            description="Production network infrastructure",
            color="00ff00"
        ),
        Role(
            name="Development",
            slug="development",
            description="Development and testing environment",
            color="ffaa00"
        ),
        Role(
            name="Management",
            slug="management",
            description="Network management and monitoring",
            color="0000ff"
        ),
        Role(
            name="DMZ",
            slug="dmz",
            description="Demilitarized zone for public-facing services",
            color="ff0000"
        )
    ]
    session.add_all(roles)
    session.commit()
    return roles

def create_vlans(session, sites: List[Site], roles: List[Role], tenant: Tenant) -> List[VLAN]:
    """Create standard VLANs for each site"""
    vlans = []
    for site in sites:
        vlans.extend([
            VLAN(
                name=f"{site.name} Production",
                slug=f"{site.slug}-prod",
                description=f"Production VLAN for {site.name}",
                vid=100,
                site=site,
                role=roles[0],
                tenant=tenant
            ),
            VLAN(
                name=f"{site.name} Development",
                slug=f"{site.slug}-dev",
                description=f"Development VLAN for {site.name}",
                vid=200,
                site=site,
                role=roles[1],
                tenant=tenant
            ),
            VLAN(
                name=f"{site.name} Management",
                slug=f"{site.slug}-mgmt",
                description=f"Management VLAN for {site.name}",
                vid=999,
                site=site,
                role=roles[2],
                tenant=tenant
            )
        ])
    session.add_all(vlans)
    session.commit()
    return vlans

def create_prefixes(session, sites: List[Site], vrfs: List[VRF], roles: List[Role], tenant: Tenant) -> List[Prefix]:
    """Create IP prefixes for each site and environment"""
    prefixes = []
    
    # Production prefixes
    prefixes.append(
        Prefix(
            name="Global Production",
            slug="global-prod",
            description="Global production network",
            prefix="10.0.0.0/8",
            status=PrefixStatusEnum.ACTIVE,
            vrf=vrfs[0],
            role=roles[0],
            tenant=tenant
        )
    )
    
    # Site-specific production prefixes
    for i, site in enumerate(sites):
        prefixes.append(
            Prefix(
                name=f"{site.name} Production",
                slug=f"{site.slug}-prod",
                description=f"Production network for {site.name}",
                prefix=f"10.{i+1}.0.0/16",
                status=PrefixStatusEnum.ACTIVE,
                vrf=vrfs[0],
                role=roles[0],
                site=site,
                tenant=tenant
            )
        )
    
    # Development prefixes
    prefixes.append(
        Prefix(
            name="Global Development",
            slug="global-dev",
            description="Global development network",
            prefix="172.16.0.0/12",
            status=PrefixStatusEnum.ACTIVE,
            vrf=vrfs[1],
            role=roles[1],
            tenant=tenant
        )
    )
    
    # Management prefixes
    prefixes.append(
        Prefix(
            name="Global Management",
            slug="global-mgmt",
            description="Global management network",
            prefix="192.168.0.0/16",
            status=PrefixStatusEnum.ACTIVE,
            vrf=vrfs[2],
            role=roles[2],
            tenant=tenant
        )
    )
    
    # DMZ prefixes
    prefixes.append(
        Prefix(
            name="Global DMZ",
            slug="global-dmz",
            description="Global DMZ network",
            prefix="203.0.113.0/24",
            status=PrefixStatusEnum.ACTIVE,
            vrf=vrfs[3],
            role=roles[3],
            tenant=tenant
        )
    )
    
    session.add_all(prefixes)
    session.commit()
    return prefixes

def create_devices(session, sites: List[Site], tenant: Tenant) -> List[Device]:
    """Create core network devices for each site"""
    devices = []
    for site in sites:
        devices.append(
            Device(
                name=f"{site.name} Core Router",
                description=f"Core router for {site.name}",
                site=site,
                tenant=tenant
            )
        )
        devices.append(
            Device(
                name=f"{site.name} Core Switch",
                description=f"Core switch for {site.name}",
                site=site,
                tenant=tenant
            )
        )
    session.add_all(devices)
    session.commit()
    return devices