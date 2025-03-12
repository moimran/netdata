from typing import Dict, Any, List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlmodel import Session, select
from pydantic import BaseModel
from ...database import get_session
from ...models import Prefix, IPAddress
import ipaddress
import logging

# Configure logging
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

# Define request and response models
class PrefixLookupRequest(BaseModel):
    ip: str
    vrf_id: Optional[int] = None

class PrefixLookupResponse(BaseModel):
    prefix_id: int
    prefix: str
    vrf_id: Optional[int] = None

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

@router.post("/find-prefix", response_model=PrefixLookupResponse)
def find_prefix(request: PrefixLookupRequest, session: Session = Depends(get_session)):
    """
    Find the longest matching prefix for an IP address.
    
    Args:
        request: PrefixLookupRequest containing IP address and optional VRF ID
        
    Returns:
        PrefixLookupResponse with prefix_id, prefix, and vrf_id
    """
    try:
        ip = request.ip
        vrf_id = request.vrf_id
        logger.info(f"Finding prefix for IP address {ip} in VRF {vrf_id}")
        # Parse the IP address
        try:
            # Remove mask if present
            if '/' in ip:
                ip_obj = ipaddress.ip_address(ip.split('/')[0])
            else:
                ip_obj = ipaddress.ip_address(ip)
        except ValueError as e:
            raise HTTPException(status_code=400, detail=f"Invalid IP address: {str(e)}")
        
        # Query for all prefixes
        query = select(Prefix)
        
        # Filter by VRF if provided
        if vrf_id:
            query = query.where((Prefix.vrf_id == vrf_id) | (Prefix.vrf_id == None))
        
        prefixes = session.exec(query).all()
        
        # Find the longest matching prefix
        best_prefix = None
        best_mask = -1
        
        for prefix in prefixes:
            try:
                prefix_network = ipaddress.ip_network(prefix.prefix)
                
                # Skip if not the same IP version
                if prefix_network.version != ip_obj.version:
                    continue
                
                # Check if the IP is in this prefix
                if ip_obj in prefix_network:
                    # If we found a better (more specific) prefix
                    if prefix_network.prefixlen > best_mask:
                        best_prefix = prefix
                        best_mask = prefix_network.prefixlen
            except ValueError:
                # Skip invalid networks
                continue
        
        if not best_prefix:
            raise HTTPException(
                status_code=404,
                detail="Please add related prefix for this ip address"
            )
        
        return {
            "prefix_id": best_prefix.id,
            "prefix": str(best_prefix.prefix),
            "vrf_id": best_prefix.vrf_id
        }
    except HTTPException:
        # Re-raise HTTP exceptions
        raise
    except Exception as e:
        logger.error(f"Error finding prefix: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Error finding prefix: {str(e)}")
