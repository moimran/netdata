from sqlmodel import Session, create_engine, delete
import sys
import os
from typing import List



sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))


from app.models import (
    Site, VRF, Prefix, IPRange, Role, RouteTarget, Tenant, VLAN, RIR, ASN, ASNRange,
    Device, Interface, Location, Region, SiteGroup, VRFImportTargets, VRFExportTargets,
    IPAddress
)

# Database connection
DATABASE_URL = "postgresql://postgres:moimran%40123@127.0.0.1:5432/ipam"
engine = create_engine(DATABASE_URL)

def delete_all_data():
    print("Starting data deletion...")
    with Session(engine) as session:
        # Delete data from all tables in reverse order of dependencies
        print("Deleting IP Addresses...")
        session.exec(delete(IPAddress))
        
        print("Deleting IP Ranges...")
        session.exec(delete(IPRange))
        
        print("Deleting Prefixes...")
        session.exec(delete(Prefix))
        
        print("Deleting VLANs...")
        session.exec(delete(VLAN))
        
        print("Deleting Devices and Interfaces...")
        session.exec(delete(Interface))
        session.exec(delete(Device))
        
        print("Deleting Locations...")
        session.exec(delete(Location))
        
        print("Deleting Sites...")
        session.exec(delete(Site))
        
        print("Deleting Site Groups...")
        session.exec(delete(SiteGroup))
        
        print("Deleting Regions...")
        session.exec(delete(Region))
        
        print("Deleting VRF Import/Export Targets...")
        session.exec(delete(VRFImportTargets))
        session.exec(delete(VRFExportTargets))
        
        print("Deleting Route Targets...")
        session.exec(delete(RouteTarget))
        
        print("Deleting VRFs...")
        session.exec(delete(VRF))
        
        print("Deleting Roles...")
        session.exec(delete(Role))
        
        print("Deleting Tenants...")
        session.exec(delete(Tenant))
        
        print("Deleting ASNs and ASN Ranges...")
        session.exec(delete(ASN))
        session.exec(delete(ASNRange))
        
        print("Deleting RIRs...")
        session.exec(delete(RIR))
        
        session.commit()
        print("All data deleted successfully!")

if __name__ == "__main__":
    try:
        delete_all_data()
    except Exception as e:
        print(f"Error deleting data: {str(e)}")
        raise
