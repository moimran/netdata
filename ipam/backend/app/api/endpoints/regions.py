from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session

from ...db.session import get_session
from ...crud_legacy import crud
from ...schemas.organizational import RegionRead

router = APIRouter()

@router.get("/")
def get_regions(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_session)
):
    """
    Get all regions with optional pagination.
    """
    regions = crud.region.get_all(session=db, skip=skip, limit=limit)
    
    # Convert each region to a dictionary with properly formatted fields
    region_dicts = []
    for region in regions:
        region_dict = region.dict()
        # Ensure parent_id is properly formatted for the frontend
        if region.parent_id:
            region_dict["parent_id"] = str(region.parent_id)
        region_dicts.append(region_dict)
    
    # Format the response to match what the frontend expects
    # The frontend expects an object with 'items' array
    return {
        "items": region_dicts,
        "total": len(regions),
        "page": 1,
        "size": limit
    }

@router.get("/{region_id}", response_model=RegionRead)
def get_region(
    region_id: UUID,
    db: Session = Depends(get_session)
):
    """
    Get a specific region by ID.
    """
    region = crud.region.get_by_id(session=db, id=region_id)
    if not region:
        raise HTTPException(status_code=404, detail="Region not found")
    return region
