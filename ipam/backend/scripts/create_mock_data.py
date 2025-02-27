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

def create_mock_data():
    print("Starting mock data creation...")
    with Session(engine) as session:
        print("Creating RIRs...")
        # Create RIRs first
        print("Creating RIRs...")
        rirs = [
            RIR(
                name="ARIN",
                slug="arin",
                description="American Registry for Internet Numbers"
            ),
            RIR(
                name="RIPE NCC",
                slug="ripe-ncc",
                description="Réseaux IP Européens Network Coordination Centre"
            ),
            RIR(
                name="APNIC",
                slug="apnic",
                description="Asia-Pacific Network Information Centre"
            )
        ]
        session.add_all(rirs)
        session.commit()
        print(f"Created {len(rirs)} RIRs")

        # Create ASN Ranges
        print("Creating ASN Ranges...")
        asn_ranges = [
            ASNRange(
                name="ARIN Private ASN Range",
                slug="arin-private-asn",
                description="Private ASN range for ARIN region",
                start=64512,
                end=65534,
                rir=rirs[0]  # ARIN
            ),
            ASNRange(
                name="RIPE Private ASN Range",
                slug="ripe-private-asn",
                description="Private ASN range for RIPE region",
                start=65000,
                end=65100,
                rir=rirs[1]  # RIPE
            )
        ]
        session.add_all(asn_ranges)
        session.commit()
        print(f"Created {len(asn_ranges)} ASN Ranges")

        # Create ASNs
        print("Creating ASNs...")
        asns = [
            ASN(
                asn=65000,
                name="Example Corp Global ASN",
                slug="example-corp-global",
                description="Primary ASN for Example Corp",
                rir=rirs[0]
            ),
            ASN(
                asn=65001,
                name="Example Corp US East",
                slug="example-corp-us-east",
                description="US East Region ASN",
                rir=rirs[0]
            ),
            ASN(
                asn=65002,
                name="Example Corp US West",
                slug="example-corp-us-west",
                description="US West Region ASN",
                rir=rirs[0]
            )
        ]
        session.add_all(asns)
        session.commit()
        print(f"Created {len(asns)} ASNs")

        # Create Tenant
        print("Creating Tenant...")
        tenant = Tenant(
            name="Example Corp",
            slug="example-corp",
            description="Example Corporation - Global Enterprise"
        )
        session.add(tenant)
        session.commit()
        print(f"Created Tenant: {tenant.name}")

        # Create Roles
        print("Creating Roles...")
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
            ),
            Role(
                name="Guest",
                slug="guest",
                description="Guest network access",
                color="808080"
            )
        ]
        session.add_all(roles)
        session.commit()
        print(f"Created {len(roles)} Roles")

        # Create Sites (Data Centers and Offices)
        print("Creating Sites...")
        sites = [
            Site(
                name="NYC-DC1",
                slug="nyc-dc1",
                description="New York Primary Data Center",
                facility="Equinix NY5",
                physical_address="100 Wall Street, New York, NY",
                latitude=40.7128,
                longitude=-74.0060,
                status="active",
                contact_name="John Smith",
                contact_email="john.smith@example.com",
                contact_phone="+1-212-555-0100",
                tenant=tenant
            ),
            Site(
                name="SJC-DC1",
                slug="sjc-dc1",
                description="San Jose Secondary Data Center",
                facility="Digital Realty SJC1",
                physical_address="11 Great Oaks Blvd, San Jose, CA",
                latitude=37.3382,
                longitude=-121.8863,
                status="active",
                contact_name="Jane Doe",
                contact_email="jane.doe@example.com",
                contact_phone="+1-408-555-0200",
                tenant=tenant
            ),
            Site(
                name="LON-DC1",
                slug="lon-dc1",
                description="London Data Center",
                facility="Telehouse North",
                physical_address="35 Coriander Avenue, London",
                latitude=51.5074,
                longitude=-0.1278,
                status="active",
                contact_name="James Wilson",
                contact_email="james.wilson@example.com",
                contact_phone="+44-20-7123-4567",
                tenant=tenant
            ),
            Site(
                name="NYC-OFF1",
                slug="nyc-off1",
                description="New York HQ Office",
                facility="Corporate HQ",
                physical_address="350 5th Avenue, New York, NY",
                latitude=40.7486,
                longitude=-73.9864,
                status="active",
                contact_name="Sarah Johnson",
                contact_email="sarah.j@example.com",
                contact_phone="+1-212-555-0300",
                tenant=tenant
            ),
            Site(
                name="SFO-OFF1",
                slug="sfo-off1",
                description="San Francisco Office",
                facility="SF Branch Office",
                physical_address="101 California St, San Francisco, CA",
                latitude=37.7749,
                longitude=-122.4194,
                status="active",
                contact_name="Michael Brown",
                contact_email="michael.b@example.com",
                contact_phone="+1-415-555-0400",
                tenant=tenant
            )
        ]
        session.add_all(sites)
        session.commit()
        print(f"Created {len(sites)} Sites")

        # Create VLANs
        print("Creating VLANs...")
        vlans = [
            VLAN(
                name="Production",
                slug="prod",
                description="Production Network VLAN",
                vid=100,
                site=sites[0],
                role=roles[0],
                tenant=tenant
            ),
            VLAN(
                name="Development",
                slug="dev",
                description="Development Network VLAN",
                vid=200,
                site=sites[0],
                role=roles[1],
                tenant=tenant
            ),
            VLAN(
                name="Management",
                slug="mgmt",
                description="Management Network VLAN",
                vid=999,
                site=sites[0],
                role=roles[2],
                tenant=tenant
            )
        ]
        session.add_all(vlans)
        session.commit()
        print(f"Created {len(vlans)} VLANs")

        # Create Route Targets for different environments
        print("Creating Route Targets...")
        route_targets = [
            RouteTarget(
                name="65000:100",
                slug="rt-prod-100",
                description="Production VRF Route Target"
            ),
            RouteTarget(
                name="65000:200",
                slug="rt-dev-200",
                description="Development VRF Route Target"
            ),
            RouteTarget(
                name="65000:300",
                slug="rt-mgmt-300",
                description="Management VRF Route Target"
            ),
            RouteTarget(
                name="65000:400",
                slug="rt-dmz-400",
                description="DMZ VRF Route Target"
            )
        ]
        session.add_all(route_targets)
        session.commit()
        print(f"Created {len(route_targets)} Route Targets")

        # Create VRFs
        print("Creating VRFs...")
        vrfs = [
            VRF(
                name="PROD-VRF",
                slug="prod-vrf",
                description="Production VRF",
                rd="65000:100",
                enforce_unique=True,
                tenant=tenant
            ),
            VRF(
                name="DEV-VRF",
                slug="dev-vrf",
                description="Development VRF",
                rd="65000:200",
                enforce_unique=True,
                tenant=tenant
            ),
            VRF(
                name="MGMT-VRF",
                slug="mgmt-vrf",
                description="Management VRF",
                rd="65000:300",
                enforce_unique=True,
                tenant=tenant
            ),
            VRF(
                name="DMZ-VRF",
                slug="dmz-vrf",
                description="DMZ VRF",
                rd="65000:400",
                enforce_unique=True,
                tenant=tenant
            )
        ]
        session.add_all(vrfs)
        session.commit()
        print(f"Created {len(vrfs)} VRFs")

        # Associate Route Targets with VRFs
        vrfs[0].import_targets = [route_targets[0]]
        vrfs[0].export_targets = [route_targets[0]]
        vrfs[1].import_targets = [route_targets[1]]
        vrfs[1].export_targets = [route_targets[1]]
        vrfs[2].import_targets = [route_targets[2]]
        vrfs[2].export_targets = [route_targets[2]]
        vrfs[3].import_targets = [route_targets[3]]
        vrfs[3].export_targets = [route_targets[3]]
        session.commit()

        # Create Production Prefixes
        print("Creating Production Prefixes...")
        prod_prefixes = [
            # NYC DC Production
            Prefix(
                name="NYC-DC Prod Network",
                slug="nyc-dc-prod",
                description="NYC DC Production Network",
                prefix="10.1.0.0/16",
                status=PrefixStatusEnum.ACTIVE,
                vrf=vrfs[0],
                role=roles[0],
                site=sites[0],
                tenant=tenant,
                vlan=vlans[0]
            ),
            # SJC DC Production
            Prefix(
                name="SJC-DC Prod Network",
                slug="sjc-dc-prod",
                description="SJC DC Production Network",
                prefix="10.2.0.0/16",
                status=PrefixStatusEnum.ACTIVE,
                vrf=vrfs[0],
                role=roles[0],
                site=sites[1],
                tenant=tenant,
                vlan=vlans[0]
            ),
            # LON DC Production
            Prefix(
                name="LON-DC Prod Network",
                slug="lon-dc-prod",
                description="London DC Production Network",
                prefix="10.3.0.0/16",
                status=PrefixStatusEnum.ACTIVE,
                vrf=vrfs[0],
                role=roles[0],
                site=sites[2],
                tenant=tenant,
                vlan=vlans[0]
            )
        ]
        session.add_all(prod_prefixes)
        session.commit()
        print(f"Created {len(prod_prefixes)} Production Prefixes")

        # Create Management Prefixes
        print("Creating Management Prefixes...")
        mgmt_prefixes = [
            Prefix(
                name="Global Management",
                slug="global-mgmt",
                description="Global Management Network",
                prefix="172.16.0.0/16",
                status=PrefixStatusEnum.ACTIVE,
                vrf=vrfs[2],
                role=roles[2],
                tenant=tenant,
                vlan=vlans[2]
            ),
            Prefix(
                name="NYC Office Management",
                slug="nyc-office-mgmt",
                description="NYC Office Management Network",
                prefix="172.17.0.0/16",
                status=PrefixStatusEnum.ACTIVE,
                vrf=vrfs[2],
                role=roles[2],
                site=sites[3],
                tenant=tenant,
                vlan=vlans[2]
            ),
            Prefix(
                name="SFO Office Management",
                slug="sfo-office-mgmt",
                description="SFO Office Management Network",
                prefix="172.18.0.0/16",
                status=PrefixStatusEnum.ACTIVE,
                vrf=vrfs[2],
                role=roles[2],
                site=sites[4],
                tenant=tenant,
                vlan=vlans[2]
            )
        ]
        session.add_all(mgmt_prefixes)
        session.commit()
        print(f"Created {len(mgmt_prefixes)} Management Prefixes")

        # Create DMZ Prefixes
        print("Creating DMZ Prefixes...")
        dmz_prefixes = [
            Prefix(
                name="NYC DMZ",
                slug="nyc-dmz",
                description="NYC Data Center DMZ",
                prefix="192.168.1.0/24",
                status=PrefixStatusEnum.ACTIVE,
                vrf=vrfs[3],
                role=roles[3],
                site=sites[0],
                tenant=tenant
            ),
            Prefix(
                name="SJC DMZ",
                slug="sjc-dmz",
                description="SJC Data Center DMZ",
                prefix="192.168.2.0/24",
                status=PrefixStatusEnum.ACTIVE,
                vrf=vrfs[3],
                role=roles[3],
                site=sites[1],
                tenant=tenant
            ),
            Prefix(
                name="LON DMZ",
                slug="lon-dmz",
                description="London Data Center DMZ",
                prefix="192.168.3.0/24",
                status=PrefixStatusEnum.ACTIVE,
                vrf=vrfs[3],
                role=roles[3],
                site=sites[2],
                tenant=tenant
            )
        ]
        session.add_all(dmz_prefixes)
        session.commit()
        print(f"Created {len(dmz_prefixes)} DMZ Prefixes")

        # Create Development Prefixes
        print("Creating Development Prefixes...")
        dev_prefixes = [
            Prefix(
                name="NYC Development",
                slug="nyc-dev",
                description="NYC Development Network",
                prefix="172.20.0.0/16",
                status=PrefixStatusEnum.ACTIVE,
                vrf=vrfs[1],
                role=roles[1],
                site=sites[0],
                tenant=tenant,
                vlan=vlans[1]
            ),
            Prefix(
                name="SJC Development",
                slug="sjc-dev",
                description="SJC Development Network",
                prefix="172.21.0.0/16",
                status=PrefixStatusEnum.ACTIVE,
                vrf=vrfs[1],
                role=roles[1],
                site=sites[1],
                tenant=tenant,
                vlan=vlans[1]
            )
        ]
        session.add_all(dev_prefixes)
        session.commit()
        print(f"Created {len(dev_prefixes)} Development Prefixes")

        # Create IP Ranges for specific use cases
        print("Creating IP Ranges...")
        ip_ranges = [
            # Production Ranges
            IPRange(
                name="NYC-DC Prod App Servers",
                slug="nyc-dc-prod-app",
                description="NYC Production Application Servers",
                start_address="10.1.1.0",
                end_address="10.1.1.255",
                status=IPRangeStatusEnum.ACTIVE,
                vrf=vrfs[0],
                tenant=tenant
            ),
            IPRange(
                name="NYC-DC Prod DB Servers",
                slug="nyc-dc-prod-db",
                description="NYC Production Database Servers",
                start_address="10.1.2.0",
                end_address="10.1.2.255",
                status=IPRangeStatusEnum.ACTIVE,
                vrf=vrfs[0],
                tenant=tenant
            ),
            IPRange(
                name="SJC-DC Prod App Servers",
                slug="sjc-dc-prod-app",
                description="SJC Production Application Servers",
                start_address="10.2.1.0",
                end_address="10.2.1.255",
                status=IPRangeStatusEnum.ACTIVE,
                vrf=vrfs[0],
                tenant=tenant
            ),
            # Management Ranges
            IPRange(
                name="NYC Management Devices",
                slug="nyc-mgmt-dev",
                description="NYC Management Network Devices",
                start_address="172.16.1.0",
                end_address="172.16.1.255",
                status=IPRangeStatusEnum.ACTIVE,
                vrf=vrfs[2],
                tenant=tenant
            ),
            IPRange(
                name="SJC Management Devices",
                slug="sjc-mgmt-dev",
                description="SJC Management Network Devices",
                start_address="172.16.2.0",
                end_address="172.16.2.255",
                status=IPRangeStatusEnum.ACTIVE,
                vrf=vrfs[2],
                tenant=tenant
            ),
            # DMZ Ranges
            IPRange(
                name="NYC DMZ Web Servers",
                slug="nyc-dmz-web",
                description="NYC DMZ Web Servers",
                start_address="192.168.1.0",
                end_address="192.168.1.127",
                status=IPRangeStatusEnum.ACTIVE,
                vrf=vrfs[3],
                tenant=tenant
            ),
            IPRange(
                name="SJC DMZ Web Servers",
                slug="sjc-dmz-web",
                description="SJC DMZ Web Servers",
                start_address="192.168.2.0",
                end_address="192.168.2.127",
                status=IPRangeStatusEnum.ACTIVE,
                vrf=vrfs[3],
                tenant=tenant
            )
        ]
        session.add_all(ip_ranges)
        session.commit()
        print(f"Created {len(ip_ranges)} IP Ranges")

if __name__ == "__main__":
    try:
        create_mock_data()
        print("Mock data created successfully!")
    except Exception as e:
        print(f"Error creating mock data: {str(e)}")
        raise
