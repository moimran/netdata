#!/usr/bin/env python3
"""
Script to update the prefix hierarchy for existing prefixes.
This script will:
1. Find parent-child relationships between existing prefixes
2. Update the parent_id, depth, and child_count fields
"""

import sys
import os
import ipaddress
from sqlmodel import Session, select

# Add the parent directory to the path so we can import the app modules
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app.database import engine
from app.models.ip_prefix import Prefix

def update_prefix_hierarchy():
    """Update the prefix hierarchy for all prefixes."""
    with Session(engine) as session:
        # Get all prefixes
        prefixes = session.exec(select(Prefix)).all()
        
        print(f"Found {len(prefixes)} prefixes")
        
        # Reset hierarchy fields
        for prefix in prefixes:
            prefix.parent_id = None
            prefix.depth = 0
            prefix.child_count = 0
        
        # Build a dictionary of prefixes by VRF for faster lookups
        prefixes_by_vrf = {}
        for prefix in prefixes:
            vrf_id = prefix.vrf_id
            if vrf_id not in prefixes_by_vrf:
                prefixes_by_vrf[vrf_id] = []
            prefixes_by_vrf[vrf_id].append(prefix)
        
        # Find parent-child relationships
        updated_count = 0
        for prefix in prefixes:
            try:
                # Convert to IP network
                network = ipaddress.ip_network(prefix.prefix)
                
                # Get prefixes in the same VRF
                vrf_prefixes = prefixes_by_vrf.get(prefix.vrf_id, [])
                
                # Find the best parent (smallest prefix that contains this one)
                best_parent = None
                best_mask = -1
                
                for potential_parent in vrf_prefixes:
                    if potential_parent.id == prefix.id:
                        continue  # Skip self
                    
                    try:
                        parent_network = ipaddress.ip_network(potential_parent.prefix)
                        
                        # Skip if not the same IP version
                        if parent_network.version != network.version:
                            continue
                        
                        # Check if this prefix is a subnet of the potential parent
                        if network.subnet_of(parent_network) and network != parent_network:
                            # If we found a better (more specific) parent
                            if parent_network.prefixlen > best_mask:
                                best_parent = potential_parent
                                best_mask = parent_network.prefixlen
                    except ValueError:
                        # Skip invalid networks
                        continue
                
                # Update parent-child relationship
                if best_parent:
                    prefix.parent_id = best_parent.id
                    prefix.depth = best_parent.depth + 1
                    best_parent.child_count += 1
                    updated_count += 1
            except Exception as e:
                print(f"Error processing prefix {prefix.prefix}: {str(e)}")
        
        # Commit changes
        session.commit()
        
        print(f"Updated {updated_count} prefixes with parent-child relationships")

if __name__ == "__main__":
    update_prefix_hierarchy()
