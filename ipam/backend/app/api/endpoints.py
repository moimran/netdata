from fastapi import APIRouter, HTTPException, Depends, Query
from sqlmodel import Session, select
from typing import Optional
from ..database import get_session
from ..models import Prefix, VRF, IPAddress
import ipaddress
import logging

# Configure logging
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

# Create router for specialized endpoints
router = APIRouter()

# Get prefixes in a hierarchical structure
@router.get("/prefixes/hierarchy", tags=["Prefixes"])
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
        # Use the specialized CRUD method to get the hierarchy
        from .. import crud
        prefixes = crud.prefix.get_hierarchy(session, vrf_id)
        
        from ..serializers import model_to_dict
        return model_to_dict({"items": prefixes})
    except Exception as e:
        logger.error(f"Error getting prefix hierarchy: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Error getting prefix hierarchy: {str(e)}")

# Get available IP addresses in a prefix
@router.get("/prefixes/{prefix_id}/available-ips")
def get_available_ips(
    prefix_id: int,
    limit: int = Query(100, ge=1, le=1000),
    session: Session = Depends(get_session)
):
    pass

# Get prefix utilization
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
        from ..models.ip_utils import calculate_prefix_utilization
        
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

# Add a VRF prefix counts endpoint
@router.get("/vrfs/prefix-counts", tags=["VRFs"])
def get_vrf_prefix_counts(session: Session = Depends(get_session)):
    """
    Get the count of prefixes for each VRF.
    Returns a dictionary with VRF IDs as keys and prefix counts as values.
    """
    vrfs = session.exec(select(VRF)).all()
    result = {}
    
    for vrf in vrfs:
        # Count prefixes for this VRF
        query = select(Prefix).where(Prefix.vrf_id == vrf.id)
        count = len(session.exec(query).all())
        result[vrf.id] = count
    
    from ..serializers import model_to_dict
    return model_to_dict(result)
