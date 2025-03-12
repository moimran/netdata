from fastapi import APIRouter, HTTPException, Depends, Query
from sqlmodel import Session, select
from typing import Optional
from ..database import get_session
from ..models import Prefix, VRF
import logging

# Configure logging
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

# Create router for specialized endpoints
router = APIRouter()

# Get available IP addresses in a prefix
@router.get("/prefixes/{prefix_id}/available-ips")
def get_available_ips(
    prefix_id: int,
    limit: int = Query(100, ge=1, le=1000),
    session: Session = Depends(get_session)
):
    pass

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

# Import credential endpoints
# Note: We'll register the credential router in the main router.py file
# to avoid circular imports
