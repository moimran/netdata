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

def create_mock_data():
    print("Starting mock data creation...")
    with Session(engine) as session:
        # Create Regions
        print("Creating Regions...")
        regions = [
            Region(
                name="Global",
                slug="global",
                description="Global Region"
            ),
            Region(
                name="North America",
                slug="na",
                description="North America Region"
            ),
            Region(
                name="Europe",
                slug="eu",
                description="Europe Region"
            ),
            Region(
                name="Asia-Pacific",
                slug="ap",
                description="Asia-Pacific Region"
            )
        ]
        session.add_all(regions)
        session.commit()
        
        # Set parent-child relationships for regions
        regions[1].parent_id = regions[0].id  # North America -> Global
        regions[2].parent_id = regions[0].id  # Europe -> Global
        regions[3].parent_id = regions[0].id  # Asia-Pacific -> Global
        
        # Add sub-regions
        sub_regions = [
            Region(
                name="US East",
                slug="us-east",
                description="US East Region",
                parent_id=regions[1].id  # Parent: North America
            ),
            Region(
                name="US West",
                slug="us-west",
                description="US West Region",
                parent_id=regions[1].id  # Parent: North America
            ),
            Region(
                name="Western Europe",
                slug="western-eu",
                description="Western Europe Region",
                parent_id=regions[2].id  # Parent: Europe
            ),
            Region(
                name="Eastern Europe",
                slug="eastern-eu",
                description="Eastern Europe Region",
                parent_id=regions[2].id  # Parent: Europe
            ),
            Region(
                name="Southeast Asia",
                slug="sea",
                description="Southeast Asia Region",
                parent_id=regions[3].id  # Parent: Asia-Pacific
            )
        ]
        session.add_all(sub_regions)
        session.commit()
        
        # Add all regions to the list
        regions.extend(sub_regions)
        print(f"Created {len(regions)} Regions")
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
                tenant=tenant,
                region_id=sub_regions[0].id  # US East
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
                tenant=tenant,
                region_id=sub_regions[1].id  # US West
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
                tenant=tenant,
                region_id=sub_regions[2].id  # Western Europe
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
                tenant=tenant,
                region_id=sub_regions[0].id  # US East
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
                tenant=tenant,
                region_id=sub_regions[1].id  # US West
            )
        ]
        session.add_all(sites)
        session.commit()
        print(f"Created {len(sites)} Sites")
        
        # Create Locations with parent-child relationships
        print("Creating Locations...")
        locations = [
            # NYC DC1 Locations
            Location(
                name="NYC-DC1-Floor1",
                slug="nyc-dc1-floor1",
                description="NYC DC1 Floor 1",
                status="active",
                site_id=sites[0].id
            ),
            Location(
                name="NYC-DC1-Floor2",
                slug="nyc-dc1-floor2",
                description="NYC DC1 Floor 2",
                status="active",
                site_id=sites[0].id
            ),
            # SJC DC1 Locations
            Location(
                name="SJC-DC1-Floor1",
                slug="sjc-dc1-floor1",
                description="SJC DC1 Floor 1",
                status="active",
                site_id=sites[1].id
            ),
            # LON DC1 Locations
            Location(
                name="LON-DC1-Floor1",
                slug="lon-dc1-floor1",
                description="LON DC1 Floor 1",
                status="active",
                site_id=sites[2].id
            )
        ]
        session.add_all(locations)
        session.commit()
        
        # Create sub-locations (rooms)
        sub_locations = [
            # NYC DC1 Floor 1 Rooms
            Location(
                name="NYC-DC1-F1-ServerRoom",
                slug="nyc-dc1-f1-server",
                description="NYC DC1 Floor 1 Server Room",
                status="active",
                site_id=sites[0].id,
                parent_id=locations[0].id
            ),
            Location(
                name="NYC-DC1-F1-NetworkRoom",
                slug="nyc-dc1-f1-network",
                description="NYC DC1 Floor 1 Network Room",
                status="active",
                site_id=sites[0].id,
                parent_id=locations[0].id
            ),
            # NYC DC1 Floor 2 Rooms
            Location(
                name="NYC-DC1-F2-ServerRoom",
                slug="nyc-dc1-f2-server",
                description="NYC DC1 Floor 2 Server Room",
                status="active",
                site_id=sites[0].id,
                parent_id=locations[1].id
            ),
            # SJC DC1 Floor 1 Rooms
            Location(
                name="SJC-DC1-F1-ServerRoom",
                slug="sjc-dc1-f1-server",
                description="SJC DC1 Floor 1 Server Room",
                status="active",
                site_id=sites[1].id,
                parent_id=locations[2].id
            ),
            # LON DC1 Floor 1 Rooms
            Location(
                name="LON-DC1-F1-ServerRoom",
                slug="lon-dc1-f1-server",
                description="LON DC1 Floor 1 Server Room",
                status="active",
                site_id=sites[2].id,
                parent_id=locations[3].id
            )
        ]
        session.add_all(sub_locations)
        session.commit()
        
        # Add all locations to the list
        locations.extend(sub_locations)
        print(f"Created {len(locations)} Locations")

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
