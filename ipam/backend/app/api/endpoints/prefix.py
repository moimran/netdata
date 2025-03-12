from typing import Dict, Any, List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlmodel import Session, select
from ...database import get_session
from ...models import Prefix, IPAddress
import ipaddress
import logging

# Configure logging
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

router = APIRouter()

@router.get("/prefixes/hierarchy")
def get_prefix_hierarchy(
    vrf_id: Optional[int] = None,
    session: Session = Depends(get_session)
):
    """
    Get prefixes in a hierarchical structure.
    
    Args:
        vrf_id: Optional VRF ID to filter by
    
    Returns:
        List of prefixes with hierarchical information
    """
    try:
        from ...crud import prefix as prefix_crud
        prefixes = prefix_crud.get_hierarchy(session, vrf_id)
        return {
            "items": prefixes,
            "total": len(prefixes)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error retrieving prefix hierarchy: {str(e)}")

@router.get("/prefixes/{prefix_id}/utilization")
def get_prefix_utilization(
    prefix_id: int,
    session: Session = Depends(get_session)
):
    """
    Get utilization data for a prefix.
    
    Args:
        prefix_id: Prefix ID
        
    Returns:
        Utilization data including percentage, used IPs, and total IPs
    """
    try:
        # Get the prefix
        prefix = session.get(Prefix, prefix_id)
        if not prefix:
            raise HTTPException(status_code=404, detail=f"Prefix with ID {prefix_id} not found")
        
        # Get IP addresses in this prefix
        query = select(IPAddress).where(IPAddress.prefix_id == prefix_id)
        ip_addresses = session.exec(query).all()
        
        # Get child prefixes
        query = select(Prefix).where(Prefix.parent_id == prefix_id)
        child_prefixes = session.exec(query).all()
        
        # Calculate utilization
        from ...models.ip_utils import calculate_prefix_utilization
        
        # Extract prefix strings from child prefixes
        child_prefix_strings = [p.prefix for p in child_prefixes]
        
        # Extract IP address strings
        ip_address_strings = [ip.address for ip in ip_addresses]
        
        # Calculate utilization percentage
        percentage = calculate_prefix_utilization(
            prefix.prefix,
            child_prefixes=child_prefix_strings,
            used_ips=ip_address_strings
        )
        
        # Calculate total IPs
        network = ipaddress.ip_network(prefix.prefix)
        total_ips = network.num_addresses
        
        # Calculate used IPs based on percentage
        used_ips = int(total_ips * (percentage / 100))
        
        return {
            "percentage": percentage,
            "used": used_ips,
            "total": total_ips
        }
    except Exception as e:
        logger.error(f"Error calculating prefix utilization: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Error calculating prefix utilization: {str(e)}")
