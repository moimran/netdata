from fastapi import APIRouter, Depends, HTTPException, Query
from sqlmodel import Session, select
from typing import List, Optional
from uuid import UUID

from ...database import get_session
from ...models.deviceinventory import DeviceInventory
from ...crud_legacy import DeviceInventoryCRUD

router = APIRouter()
device_inventory_crud = DeviceInventoryCRUD()

@router.get("/device_inventory", response_model=List[dict])
def get_device_inventory(
    skip: int = Query(0, ge=0),
    limit: int = Query(10, ge=1, le=100),
    session: Session = Depends(get_session)
):
    """
    Retrieve device inventory entries with pagination.
    """
    try:
        devices = device_inventory_crud.get_all(session, skip=skip, limit=limit)
        return [device.dict() for device in devices]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error retrieving device inventory: {str(e)}")

@router.get("/device_inventory/{device_id}", response_model=dict)
def get_device_by_id(
    device_id: UUID,
    session: Session = Depends(get_session)
):
    """
    Retrieve a specific device inventory entry by ID.
    """
    try:
        device = device_inventory_crud.get_by_device_uuid(session, device_uuid=device_id)
        if not device:
            raise HTTPException(status_code=404, detail="Device not found")
        return device.dict()
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error retrieving device: {str(e)}")
