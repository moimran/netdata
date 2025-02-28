#!/usr/bin/env python3
"""
Script to create test data with parent-child relationships for prefixes.
This will create a hierarchy of prefixes to demonstrate the hierarchical view.
"""

import sys
import os
import ipaddress
from sqlmodel import Session, select

# Add the parent directory to the path so we can import the app modules
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app.database import engine
from app.models.ip_prefix import Prefix
from app.models.vrf import VRF
from app.models.ip_constants import PrefixStatusEnum

def print_existing_prefixes():
    """Print existing prefixes in the database."""
    with Session(engine) as session:
        prefixes = session.exec(select(Prefix)).all()
        print(f"Found {len(prefixes)} existing prefixes:")
        for p in prefixes:
            print(f"ID: {p.id}, Prefix: {p.prefix}, Parent ID: {p.parent_id}, Depth: {p.depth}, Children: {p.child_count}")

def create_hierarchy_test_data():
    """Create test data with parent-child relationships."""
    with Session(engine) as session:
        # Check if we have a VRF
        vrfs = session.exec(select(VRF)).all()
        vrf_id = None
        if vrfs:
            vrf_id = vrfs[0].id
            print(f"Using existing VRF with ID: {vrf_id}")
        else:
            # Create a VRF if none exists
            vrf = VRF(name="Test-VRF", rd="65000:1")
            session.add(vrf)
            session.commit()
            session.refresh(vrf)
            vrf_id = vrf.id
            print(f"Created new VRF with ID: {vrf_id}")
        
        # Create a hierarchy of prefixes
        # Root prefix
        root = Prefix(
            prefix="10.0.0.0/8",
            name="Root Network",
            status=PrefixStatusEnum.CONTAINER,
            vrf_id=vrf_id
        )
        session.add(root)
        session.commit()
        session.refresh(root)
        print(f"Created root prefix: {root.prefix} with ID: {root.id}")
        
        # First level children
        child1 = Prefix(
            prefix="10.1.0.0/16",
            name="Child Network 1",
            status=PrefixStatusEnum.ACTIVE,
            vrf_id=vrf_id
        )
        session.add(child1)
        
        child2 = Prefix(
            prefix="10.2.0.0/16",
            name="Child Network 2",
            status=PrefixStatusEnum.ACTIVE,
            vrf_id=vrf_id
        )
        session.add(child2)
        
        # Second level children (grandchildren)
        grandchild1 = Prefix(
            prefix="10.1.1.0/24",
            name="Grandchild Network 1",
            status=PrefixStatusEnum.ACTIVE,
            vrf_id=vrf_id
        )
        session.add(grandchild1)
        
        grandchild2 = Prefix(
            prefix="10.1.2.0/24",
            name="Grandchild Network 2",
            status=PrefixStatusEnum.ACTIVE,
            vrf_id=vrf_id
        )
        session.add(grandchild2)
        
        grandchild3 = Prefix(
            prefix="10.2.1.0/24",
            name="Grandchild Network 3",
            status=PrefixStatusEnum.ACTIVE,
            vrf_id=vrf_id
        )
        session.add(grandchild3)
        
        # Commit all prefixes
        session.commit()
        
        # Now update the hierarchy
        for prefix in [child1, child2, grandchild1, grandchild2, grandchild3]:
            session.refresh(prefix)
            prefix.update_hierarchy(session)
        
        # Commit the hierarchy updates
        session.commit()
        
        print("Created hierarchy test data successfully")

if __name__ == "__main__":
    print_existing_prefixes()
    create_hierarchy_test_data()
    print("\nAfter creating test data:")
    print_existing_prefixes()
