from datetime import datetime, date
from sqlmodel import Session, create_engine
import sys
import os
from typing import List

# Add the parent directory to sys.path to import app modules
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.models import (
    Site, VRF, Prefix, IPRange, Role, RouteTarget, Tenant, VLAN, RIR, ASN, ASNRange,
    Device, Interface, Location, Region, SiteGroup, Aggregate, IPAddress
)
from app.models.ip_prefix import PrefixStatusEnum, IPRangeStatusEnum
from app.models.ip_constants import IPAddressStatusEnum, IPAddressRoleEnum

# Database connection
DATABASE_URL = "postgresql://postgres:moimran%40123@127.0.0.1:5432/ipam"
engine = create_engine(DATABASE_URL)

def create_mock_data():
    print("Starting mock data creation...")
    with Session(engine) as session:
        # Create Regions
        print("Creating Regions...")
        regions = [
            Region(name="Global", slug="global", description="Global Region"),
            Region(name="North America", slug="na", description="North America Region"),
            Region(name="Europe", slug="eu", description="Europe Region"),
            Region(name="Asia-Pacific", slug="ap", description="Asia-Pacific Region")
        ]
        session.add_all(regions)
        session.commit()
        
        # Set parent-child relationships for regions
        regions[1].parent_id = regions[0].id  # North America -> Global
        regions[2].parent_id = regions[0].id  # Europe -> Global
        regions[3].parent_id = regions[0].id  # Asia-Pacific -> Global
        session.commit()
        
        # Add sub-regions
        sub_regions = [
            Region(name="US East", slug="us-east", description="US East Region", parent_id=regions[1].id),
            Region(name="US West", slug="us-west", description="US West Region", parent_id=regions[1].id),
            Region(name="Western Europe", slug="western-eu", description="Western Europe Region", parent_id=regions[2].id),
            Region(name="Eastern Europe", slug="eastern-eu", description="Eastern Europe Region", parent_id=regions[2].id),
            Region(name="Southeast Asia", slug="sea", description="Southeast Asia Region", parent_id=regions[3].id)
        ]
        session.add_all(sub_regions)
        session.commit()
        
        # Add all regions to the list
        regions.extend(sub_regions)
        print(f"Created {len(regions)} Regions")
        
        # Create RIRs
        print("Creating RIRs...")
        rirs = [
            RIR(name="ARIN", slug="arin", description="American Registry for Internet Numbers"),
            RIR(name="RIPE NCC", slug="ripe-ncc", description="Réseaux IP Européens Network Coordination Centre"),
            RIR(name="APNIC", slug="apnic", description="Asia-Pacific Network Information Centre"),
            RIR(name="RFC 1918", slug="rfc-1918", description="Private IPv4 Address Space (RFC 1918)")
        ]
        session.add_all(rirs)
        session.commit()
        print(f"Created {len(rirs)} RIRs")
        
        # Create Aggregates for RFC 1918 private address space
        print("Creating Aggregates...")
        aggregates = [
            Aggregate(name="RFC 1918 - 10.0.0.0/8", slug="rfc1918-10", 
                     prefix="10.0.0.0/8", description="RFC 1918 Private IPv4 Space - Class A", 
                     date_added=date.today(), rir_id=rirs[3].id),
            Aggregate(name="RFC 1918 - 172.16.0.0/12", slug="rfc1918-172-16", 
                     prefix="172.16.0.0/12", description="RFC 1918 Private IPv4 Space - Class B", 
                     date_added=date.today(), rir_id=rirs[3].id),
            Aggregate(name="RFC 1918 - 192.168.0.0/16", slug="rfc1918-192-168", 
                     prefix="192.168.0.0/16", description="RFC 1918 Private IPv4 Space - Class C", 
                     date_added=date.today(), rir_id=rirs[3].id)
        ]
        session.add_all(aggregates)
        session.commit()
        print(f"Created {len(aggregates)} Aggregates")

        # Create ASN Ranges
        print("Creating ASN Ranges...")
        asn_ranges = [
            ASNRange(name="ARIN Private ASN Range", slug="arin-private-asn", 
                    description="Private ASN range for ARIN region", start=64512, end=65534, rir=rirs[0]),
            ASNRange(name="RIPE Private ASN Range", slug="ripe-private-asn", 
                    description="Private ASN range for RIPE region", start=65000, end=65100, rir=rirs[1])
        ]
        session.add_all(asn_ranges)
        session.commit()
        print(f"Created {len(asn_ranges)} ASN Ranges")

        # Create ASNs
        print("Creating ASNs...")
        asns = [
            ASN(asn=65000, name="Example Corp Global ASN", slug="example-corp-global", 
               description="Primary ASN for Example Corp", rir=rirs[0]),
            ASN(asn=65001, name="Example Corp US East", slug="example-corp-us-east", 
               description="US East Region ASN", rir=rirs[0]),
            ASN(asn=65002, name="Example Corp US West", slug="example-corp-us-west", 
               description="US West Region ASN", rir=rirs[0])
        ]
        session.add_all(asns)
        session.commit()
        print(f"Created {len(asns)} ASNs")

        # Create Tenant
        print("Creating Tenant...")
        tenant = Tenant(name="Example Corp", slug="example-corp", 
                       description="Example Corporation - Global Enterprise")
        session.add(tenant)
        session.commit()
        print(f"Created Tenant: {tenant.name}")

        # Create Roles
        print("Creating Roles...")
        roles = [
            Role(name="Production", slug="production", description="Production network infrastructure", color="00ff00"),
            Role(name="Development", slug="development", description="Development and testing environment", color="ffaa00"),
            Role(name="Management", slug="management", description="Network management and monitoring", color="0000ff"),
            Role(name="DMZ", slug="dmz", description="Demilitarized zone for public-facing services", color="ff0000"),
            Role(name="Guest", slug="guest", description="Guest network access", color="808080")
        ]
        session.add_all(roles)
        session.commit()
        print(f"Created {len(roles)} Roles")

        # Create Sites (Data Centers and Offices)
        print("Creating Sites...")
        sites = [
            Site(name="NYC-DC1", slug="nyc-dc1", description="New York Primary Data Center",
                facility="Equinix NY5", physical_address="100 Wall Street, New York, NY",
                latitude=40.7128, longitude=-74.0060, status="active",
                contact_name="John Smith", contact_email="john.smith@example.com",
                contact_phone="+1-212-555-0100", tenant=tenant, region_id=sub_regions[0].id),
            Site(name="SJC-DC1", slug="sjc-dc1", description="San Jose Secondary Data Center",
                facility="Digital Realty SJC1", physical_address="11 Great Oaks Blvd, San Jose, CA",
                latitude=37.3382, longitude=-121.8863, status="active",
                contact_name="Jane Doe", contact_email="jane.doe@example.com",
                contact_phone="+1-408-555-0200", tenant=tenant, region_id=sub_regions[1].id),
            Site(name="LON-DC1", slug="lon-dc1", description="London Data Center",
                facility="Telehouse North", physical_address="35 Coriander Avenue, London",
                latitude=51.5074, longitude=-0.1278, status="active",
                contact_name="James Wilson", contact_email="james.wilson@example.com",
                contact_phone="+44-20-7123-4567", tenant=tenant, region_id=sub_regions[2].id)
        ]
        session.add_all(sites)
        session.commit()
        print(f"Created {len(sites)} Sites")
        
        # Create VLANs
        print("Creating VLANs...")
        vlans = [
            VLAN(name="Production", slug="prod", description="Production Network VLAN",
                vid=100, site=sites[0], role=roles[0], tenant=tenant),
            VLAN(name="Development", slug="dev", description="Development Network VLAN",
                vid=200, site=sites[0], role=roles[1], tenant=tenant),
            VLAN(name="Management", slug="mgmt", description="Management Network VLAN",
                vid=999, site=sites[0], role=roles[2], tenant=tenant)
        ]
        session.add_all(vlans)
        session.commit()
        print(f"Created {len(vlans)} VLANs")

        # Create Route Targets for different environments
        print("Creating Route Targets...")
        route_targets = [
            RouteTarget(name="65000:100", slug="rt-prod-100", description="Production VRF Route Target"),
            RouteTarget(name="65000:200", slug="rt-dev-200", description="Development VRF Route Target"),
            RouteTarget(name="65000:300", slug="rt-mgmt-300", description="Management VRF Route Target"),
            RouteTarget(name="65000:400", slug="rt-dmz-400", description="DMZ VRF Route Target")
        ]
        session.add_all(route_targets)
        session.commit()
        print(f"Created {len(route_targets)} Route Targets")

        # Create VRFs
        print("Creating VRFs...")
        vrfs = [
            VRF(name="PROD-VRF", slug="prod-vrf", description="Production VRF",
               rd="65000:100", enforce_unique=True, tenant=tenant),
            VRF(name="DEV-VRF", slug="dev-vrf", description="Development VRF",
               rd="65000:200", enforce_unique=True, tenant=tenant),
            VRF(name="MGMT-VRF", slug="mgmt-vrf", description="Management VRF",
               rd="65000:300", enforce_unique=True, tenant=tenant),
            VRF(name="DMZ-VRF", slug="dmz-vrf", description="DMZ VRF",
               rd="65000:400", enforce_unique=True, tenant=tenant)
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

        # Create Production Prefixes from Aggregates
        print("Creating Production Prefixes...")
        prod_prefixes = [
            # NYC DC Production - from 10.0.0.0/8 aggregate
            Prefix(name="NYC-DC Prod Network", slug="nyc-dc-prod", description="NYC DC Production Network",
                  prefix="10.1.0.0/16", status=PrefixStatusEnum.ACTIVE, vrf=vrfs[0], role=roles[0],
                  site=sites[0], tenant=tenant, vlan=vlans[0]),
            # SJC DC Production - from 10.0.0.0/8 aggregate
            Prefix(name="SJC-DC Prod Network", slug="sjc-dc-prod", description="SJC DC Production Network",
                  prefix="10.2.0.0/16", status=PrefixStatusEnum.ACTIVE, vrf=vrfs[0], role=roles[0],
                  site=sites[1], tenant=tenant, vlan=vlans[0]),
            # LON DC Production - from 10.0.0.0/8 aggregate
            Prefix(name="LON-DC Prod Network", slug="lon-dc-prod", description="London DC Production Network",
                  prefix="10.3.0.0/16", status=PrefixStatusEnum.ACTIVE, vrf=vrfs[0], role=roles[0],
                  site=sites[2], tenant=tenant, vlan=vlans[0])
        ]
        session.add_all(prod_prefixes)
        session.commit()
        print(f"Created {len(prod_prefixes)} Production Prefixes")

        # Create IP Ranges from Prefixes
        print("Creating IP Ranges...")
        ip_ranges = [
            # Production Ranges - from 10.1.0.0/16 prefix
            IPRange(name="NYC-DC Prod App Servers", slug="nyc-dc-prod-app", 
                   description="NYC Production Application Servers", start_address="10.1.1.0", 
                   end_address="10.1.1.255", status=IPRangeStatusEnum.ACTIVE, 
                   vrf=vrfs[0], tenant=tenant),
            # Production Ranges - from 10.2.0.0/16 prefix
            IPRange(name="SJC-DC Prod App Servers", slug="sjc-dc-prod-app", 
                   description="SJC Production Application Servers", start_address="10.2.1.0", 
                   end_address="10.2.1.255", status=IPRangeStatusEnum.ACTIVE, 
                   vrf=vrfs[0], tenant=tenant)
        ]
        session.add_all(ip_ranges)
        session.commit()
        print(f"Created {len(ip_ranges)} IP Ranges")
        
        # Create IP Addresses from Prefixes
        print("Creating IP Addresses...")
        ip_addresses = [
            # NYC Production IP Addresses - from 10.1.0.0/16 prefix
            IPAddress(address="10.1.1.10/32", name="NYC-APP-01", status=IPAddressStatusEnum.ACTIVE,
                     role=IPAddressRoleEnum.LOOPBACK, dns_name="nyc-app-01.example.com",
                     vrf=vrfs[0], tenant=tenant),
            IPAddress(address="10.1.1.11/32", name="NYC-APP-02", status=IPAddressStatusEnum.ACTIVE,
                     role=IPAddressRoleEnum.LOOPBACK, dns_name="nyc-app-02.example.com",
                     vrf=vrfs[0], tenant=tenant),
            # SJC Production IP Addresses - from 10.2.0.0/16 prefix
            IPAddress(address="10.2.1.10/32", name="SJC-APP-01", status=IPAddressStatusEnum.ACTIVE,
                     role=IPAddressRoleEnum.LOOPBACK, dns_name="sjc-app-01.example.com",
                     vrf=vrfs[0], tenant=tenant)
        ]
        session.add_all(ip_addresses)
        session.commit()
        print(f"Created {len(ip_addresses)} IP Addresses")

if __name__ == "__main__":
    try:
        create_mock_data()
        print("Mock data created successfully!")
    except Exception as e:
        print(f"Error creating mock data: {str(e)}")
        raise
