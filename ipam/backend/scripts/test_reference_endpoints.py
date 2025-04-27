#!/usr/bin/env python3
"""
Test script to check if all reference endpoints are working correctly.
This script will make requests to all the table endpoints that are used for dropdowns.
"""

import requests
import json
from pprint import pprint

# Base URL for the API
BASE_URL = "http://localhost:8000/api/v1"

# List of tables used for reference data in dropdowns
REFERENCE_TABLES = [
    "regions",
    "site_groups",
    "sites",
    "locations",
    "vrfs",
    "rirs",
    "aggregates",
    "roles",
    "prefixes",
    "ip_ranges",
    "ip_addresses",
    "tenants",
    "interfaces",
    "vlans",
    "vlan_groups",
    "asns",
    "asn_ranges",
    "route_targets",
    "credentials",
    "platform_types",
    "device_inventory"
]

def test_endpoint(endpoint):
    """Test if an endpoint is working correctly."""
    url = f"{BASE_URL}/{endpoint}"
    print(f"Testing endpoint: {url}")
    
    try:
        response = requests.get(url, params={"limit": 10})
        if response.status_code == 200:
            data = response.json()
            if isinstance(data, dict) and "items" in data:
                print(f"✅ SUCCESS: {endpoint} - {len(data['items'])} items")
                if data["items"]:
                    print("Sample item:")
                    pprint(data["items"][0])
            elif isinstance(data, list):
                print(f"✅ SUCCESS: {endpoint} - {len(data)} items")
                if data:
                    print("Sample item:")
                    pprint(data[0])
            else:
                print(f"❌ ERROR: {endpoint} - Unexpected response format")
                pprint(data)
        else:
            print(f"❌ ERROR: {endpoint} - Status code {response.status_code}")
            try:
                print(response.json())
            except:
                print(response.text)
    except Exception as e:
        print(f"❌ ERROR: {endpoint} - Exception: {str(e)}")
    
    print("\n" + "-" * 80 + "\n")

def main():
    """Main function to test all reference endpoints."""
    print("Testing reference endpoints...\n")
    
    for table in REFERENCE_TABLES:
        test_endpoint(table)
    
    print("All tests completed.")

if __name__ == "__main__":
    main()
