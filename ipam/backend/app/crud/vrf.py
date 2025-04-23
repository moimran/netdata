from typing import List, Optional

from sqlmodel import Session, select
from fastapi import HTTPException

from app.models.vrf import VRF, RouteTarget
from app.schemas.vrf import VRFCreate, VRFUpdate, RouteTargetCreate, RouteTargetUpdate

# CRUD operations for RouteTarget

def get_route_target(db: Session, rt_id: int) -> Optional[RouteTarget]:
    """Get a single Route Target by ID."""
    return db.get(RouteTarget, rt_id)

def get_route_target_by_name(db: Session, name: str) -> Optional[RouteTarget]:
    """Get a single Route Target by name."""
    statement = select(RouteTarget).where(RouteTarget.name == name)
    return db.exec(statement).first()

def get_route_targets(db: Session, skip: int = 0, limit: int = 100) -> List[RouteTarget]:
    """Get a list of Route Targets."""
    statement = select(RouteTarget).offset(skip).limit(limit)
    return db.exec(statement).all()

def create_route_target(db: Session, rt_in: RouteTargetCreate) -> RouteTarget:
    """Create a new Route Target."""
    db_rt = RouteTarget.model_validate(rt_in)
    db.add(db_rt)
    db.commit()
    db.refresh(db_rt)
    return db_rt

def update_route_target(db: Session, rt_id: int, rt_in: RouteTargetUpdate) -> Optional[RouteTarget]:
    """Update an existing Route Target."""
    db_rt = db.get(RouteTarget, rt_id)
    if not db_rt:
        return None
    rt_data = rt_in.model_dump(exclude_unset=True)
    for key, value in rt_data.items():
        setattr(db_rt, key, value)
    db.add(db_rt)
    db.commit()
    db.refresh(db_rt)
    return db_rt

def delete_route_target(db: Session, rt_id: int) -> Optional[RouteTarget]:
    """Delete a Route Target."""
    db_rt = db.get(RouteTarget, rt_id)
    if not db_rt:
        return None
    # Check if route target is used by any VRF before deleting? (Optional)
    # if db_rt.importing_vrfs or db_rt.exporting_vrfs:
    #     raise HTTPException(status_code=400, detail="Route Target is in use by VRFs")
    db.delete(db_rt)
    db.commit()
    return db_rt

# CRUD operations for VRF

def get_vrf(db: Session, vrf_id: int) -> Optional[VRF]:
    """Get a single VRF by ID, including its targets."""
    # Use options to load relationships eagerly if needed, or rely on lazy loading
    # return db.get(VRF, vrf_id)
    statement = select(VRF).where(VRF.id == vrf_id)
    # Eager load targets if performance becomes an issue with lazy loading
    # statement = statement.options(selectinload(VRF.import_targets), selectinload(VRF.export_targets))
    return db.exec(statement).first()

def get_vrf_by_name(db: Session, name: str) -> Optional[VRF]:
    """Get a single VRF by name."""
    statement = select(VRF).where(VRF.name == name)
    return db.exec(statement).first()

def get_vrfs(db: Session, skip: int = 0, limit: int = 100) -> List[VRF]:
    """Get a list of VRFs."""
    statement = select(VRF).offset(skip).limit(limit)
    # Eager load targets if needed for list view
    # statement = statement.options(selectinload(VRF.import_targets), selectinload(VRF.export_targets))
    return db.exec(statement).all()

def create_vrf(db: Session, vrf_in: VRFCreate) -> VRF:
    """Create a new VRF, associating specified Route Targets."""
    # Separate target IDs from other VRF data
    import_target_ids = vrf_in.import_target_ids or []
    export_target_ids = vrf_in.export_target_ids or []
    vrf_data = vrf_in.model_dump(exclude={'import_target_ids', 'export_target_ids'})

    db_vrf = VRF.model_validate(vrf_data)

    # Fetch and associate import targets
    if import_target_ids:
        import_targets = db.exec(select(RouteTarget).where(RouteTarget.id.in_(import_target_ids))).all()
        if len(import_targets) != len(set(import_target_ids)):
            raise HTTPException(status_code=404, detail="One or more import Route Targets not found")
        db_vrf.import_targets = import_targets

    # Fetch and associate export targets
    if export_target_ids:
        export_targets = db.exec(select(RouteTarget).where(RouteTarget.id.in_(export_target_ids))).all()
        if len(export_targets) != len(set(export_target_ids)):
            raise HTTPException(status_code=404, detail="One or more export Route Targets not found")
        db_vrf.export_targets = export_targets

    db.add(db_vrf)
    db.commit()
    db.refresh(db_vrf)
    # Re-fetch to ensure relationships are loaded (or rely on lazy loading)
    return get_vrf(db, db_vrf.id) 

def update_vrf(db: Session, vrf_id: int, vrf_in: VRFUpdate) -> Optional[VRF]:
    """Update an existing VRF, including its Route Target associations."""
    db_vrf = db.get(VRF, vrf_id)
    if not db_vrf:
        return None

    # Update basic VRF fields
    vrf_data = vrf_in.model_dump(exclude_unset=True, exclude={'import_target_ids', 'export_target_ids'})
    for key, value in vrf_data.items():
        setattr(db_vrf, key, value)

    # Update import targets if provided
    if vrf_in.import_target_ids is not None:
        if not vrf_in.import_target_ids: # Empty list means remove all
            db_vrf.import_targets = []
        else:
            import_targets = db.exec(select(RouteTarget).where(RouteTarget.id.in_(vrf_in.import_target_ids))).all()
            if len(import_targets) != len(set(vrf_in.import_target_ids)):
                 raise HTTPException(status_code=404, detail="One or more import Route Targets not found")
            db_vrf.import_targets = import_targets

    # Update export targets if provided
    if vrf_in.export_target_ids is not None:
        if not vrf_in.export_target_ids: # Empty list means remove all
            db_vrf.export_targets = []
        else:
            export_targets = db.exec(select(RouteTarget).where(RouteTarget.id.in_(vrf_in.export_target_ids))).all()
            if len(export_targets) != len(set(vrf_in.export_target_ids)):
                 raise HTTPException(status_code=404, detail="One or more export Route Targets not found")
            db_vrf.export_targets = export_targets

    db.add(db_vrf)
    db.commit()
    db.refresh(db_vrf)
     # Re-fetch to ensure relationships are loaded (or rely on lazy loading)
    return get_vrf(db, db_vrf.id) 

def delete_vrf(db: Session, vrf_id: int) -> Optional[VRF]:
    """Delete a VRF."""
    db_vrf = db.get(VRF, vrf_id)
    if not db_vrf:
        return None
    # Add checks here if VRF cannot be deleted if it contains prefixes/IPs etc.
    # Example:
    # if db_vrf.prefixes or db_vrf.ip_ranges or db_vrf.ip_addresses:
    #     raise HTTPException(status_code=400, detail="VRF cannot be deleted while it contains prefixes, ranges, or IP addresses.")
    
    # Manually clear relationships if necessary before deletion, 
    # depending on cascade settings and relationship configurations.
    # db_vrf.import_targets.clear()
    # db_vrf.export_targets.clear()
    # db.commit() # Commit clearing relationships if done manually

    db.delete(db_vrf)
    db.commit()
    return db_vrf
