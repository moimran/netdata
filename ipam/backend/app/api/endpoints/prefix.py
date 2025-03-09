from typing import Dict, Any, List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlmodel import Session
from ...database import get_session
from ...models import Prefix
from ...crud import prefix as prefix_crud

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
        prefixes = prefix_crud.get_hierarchy(session, vrf_id)
        return {
            "items": prefixes,
            "total": len(prefixes)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error retrieving prefix hierarchy: {str(e)}")
