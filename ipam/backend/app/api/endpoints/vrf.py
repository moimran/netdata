from typing import List

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlmodel import Session

from app.api.deps import get_db
from app.crud import vrf as crud_vrf
from app.schemas.vrf import (
    VRFCreate, VRFRead, VRFUpdate, VRFReadWithTargets,
    RouteTargetCreate, RouteTargetRead, RouteTargetUpdate
)

router = APIRouter()

# --- Route Target Endpoints ---

@router.post("/route-targets/", response_model=RouteTargetRead, status_code=201)
def create_route_target(
    *, 
    db: Session = Depends(get_db),
    rt_in: RouteTargetCreate
):
    """Create a new Route Target."""
    existing_rt = crud_vrf.get_route_target_by_name(db=db, name=rt_in.name)
    if existing_rt:
        raise HTTPException(status_code=400, detail=f"Route Target with name '{rt_in.name}' already exists.")
    return crud_vrf.create_route_target(db=db, rt_in=rt_in)

@router.get("/route-targets/", response_model=List[RouteTargetRead])
def read_route_targets(
    db: Session = Depends(get_db),
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(100, ge=1, le=500, description="Number of records to return")
):
    """Retrieve a list of Route Targets."""
    return crud_vrf.get_route_targets(db=db, skip=skip, limit=limit)

@router.get("/route-targets/{rt_id}", response_model=RouteTargetRead)
def read_route_target(
    *, 
    db: Session = Depends(get_db),
    rt_id: int
):
    """Retrieve a specific Route Target by ID."""
    db_rt = crud_vrf.get_route_target(db=db, rt_id=rt_id)
    if not db_rt:
        raise HTTPException(status_code=404, detail="Route Target not found")
    return db_rt

@router.put("/route-targets/{rt_id}", response_model=RouteTargetRead)
def update_route_target(
    *, 
    db: Session = Depends(get_db),
    rt_id: int,
    rt_in: RouteTargetUpdate
):
    """Update a specific Route Target by ID."""
    db_rt = crud_vrf.update_route_target(db=db, rt_id=rt_id, rt_in=rt_in)
    if not db_rt:
        raise HTTPException(status_code=404, detail="Route Target not found")
    # Check for potential name conflict if name is being updated
    if rt_in.name:
        existing_rt = crud_vrf.get_route_target_by_name(db=db, name=rt_in.name)
        if existing_rt and existing_rt.id != rt_id:
             raise HTTPException(status_code=400, detail=f"Route Target name '{rt_in.name}' already exists.")
    return db_rt

@router.delete("/route-targets/{rt_id}", response_model=RouteTargetRead)
def delete_route_target(
    *, 
    db: Session = Depends(get_db),
    rt_id: int
):
    """Delete a specific Route Target by ID."""
    db_rt = crud_vrf.delete_route_target(db=db, rt_id=rt_id)
    if not db_rt:
        raise HTTPException(status_code=404, detail="Route Target not found")
    return db_rt

# --- VRF Endpoints ---

@router.post("/vrfs/", response_model=VRFReadWithTargets, status_code=201)
def create_vrf(
    *, 
    db: Session = Depends(get_db),
    vrf_in: VRFCreate
):
    """Create a new VRF, optionally associating Route Targets."""
    existing_vrf = crud_vrf.get_vrf_by_name(db=db, name=vrf_in.name)
    if existing_vrf:
        raise HTTPException(status_code=400, detail=f"VRF with name '{vrf_in.name}' already exists.")
    # RD uniqueness check could be added here if needed
    try:
        return crud_vrf.create_vrf(db=db, vrf_in=vrf_in)
    except HTTPException as e: # Catch potential 404 from RT lookup in CRUD
        raise e 
    except Exception as e:
        # Log the error details if possible
        raise HTTPException(status_code=500, detail=f"An error occurred: {str(e)}")
        
@router.get("/vrfs/", response_model=List[VRFReadWithTargets])
def read_vrfs(
    db: Session = Depends(get_db),
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(100, ge=1, le=500, description="Number of records to return")
):
    """Retrieve a list of VRFs, including their import/export targets."""
    # The CRUD function get_vrfs currently returns basic VRF, 
    # need to adjust if we want targets included in the list view by default.
    # For now, returning basic list view. Modify if targets are needed here.
    # vrfs = crud_vrf.get_vrfs(db=db, skip=skip, limit=limit) 
    # return vrfs
    
    # Example: If you want targets in the list view (might impact performance):
    vrfs = crud_vrf.get_vrfs(db=db, skip=skip, limit=limit)
    # Manually load relationships if not eager loaded in CRUD, or adjust CRUD
    results = []
    for vrf in vrfs:
        # Ensure relationships are loaded - this might trigger lazy loading
        results.append(VRFReadWithTargets.model_validate(vrf))
    return results

@router.get("/vrfs/{vrf_id}", response_model=VRFReadWithTargets)
def read_vrf(
    *, 
    db: Session = Depends(get_db),
    vrf_id: int
):
    """Retrieve a specific VRF by ID, including its import/export targets."""
    db_vrf = crud_vrf.get_vrf(db=db, vrf_id=vrf_id)
    if not db_vrf:
        raise HTTPException(status_code=404, detail="VRF not found")
    # Ensure relationships are loaded (lazy loading should handle this if configured)
    return VRFReadWithTargets.model_validate(db_vrf)

@router.put("/vrfs/{vrf_id}", response_model=VRFReadWithTargets)
def update_vrf(
    *, 
    db: Session = Depends(get_db),
    vrf_id: int,
    vrf_in: VRFUpdate
):
    """Update a specific VRF by ID, including its Route Target associations."""
    # Check for potential name conflict if name is being updated
    if vrf_in.name:
        existing_vrf = crud_vrf.get_vrf_by_name(db=db, name=vrf_in.name)
        if existing_vrf and existing_vrf.id != vrf_id:
             raise HTTPException(status_code=400, detail=f"VRF name '{vrf_in.name}' already exists.")
    # RD uniqueness check could be added here if needed

    try:
        db_vrf = crud_vrf.update_vrf(db=db, vrf_id=vrf_id, vrf_in=vrf_in)
    except HTTPException as e: # Catch potential 404 from RT lookup in CRUD
        raise e
    except Exception as e:
         # Log the error details if possible
        raise HTTPException(status_code=500, detail=f"An error occurred: {str(e)}")
        
    if not db_vrf:
        raise HTTPException(status_code=404, detail="VRF not found")
    return db_vrf

@router.delete("/vrfs/{vrf_id}", response_model=VRFRead)
def delete_vrf(
    *, 
    db: Session = Depends(get_db),
    vrf_id: int
):
    """Delete a specific VRF by ID."""
    try:
        db_vrf = crud_vrf.delete_vrf(db=db, vrf_id=vrf_id)
    except HTTPException as e: # Catch potential errors from deletion checks in CRUD
        raise e
    except Exception as e:
         # Log the error details if possible
        raise HTTPException(status_code=500, detail=f"An error occurred: {str(e)}")

    if not db_vrf:
        raise HTTPException(status_code=404, detail="VRF not found")
    return db_vrf
