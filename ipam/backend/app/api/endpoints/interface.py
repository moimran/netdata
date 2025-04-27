from fastapi import APIRouter, Depends, HTTPException, Query
from sqlmodel import Session, select
from typing import List, Optional
from uuid import UUID

from ...database import get_session
from ...models.interface import Interface
from ...crud_legacy import BaseCRUD

router = APIRouter()
interface_crud = BaseCRUD(Interface)

@router.get("/", response_model=List[dict])
def get_interfaces(
    skip: int = Query(0, ge=0),
    limit: int = Query(10, ge=1, le=100),
    session: Session = Depends(get_session)
):
    """
    Retrieve interface entries with pagination.
    """
    try:
        # Use the get_all method from the BaseCRUD class
        interfaces = interface_crud.get_all(session, skip=skip, limit=limit)
        return [interface.dict() for interface in interfaces]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error retrieving interfaces: {str(e)}")

@router.get("/{interface_id}", response_model=dict)
def get_interface_by_id(
    interface_id: int,
    session: Session = Depends(get_session)
):
    """
    Retrieve a specific interface by ID.
    """
    try:
        interface = interface_crud.get_by_id(session, interface_id)
        if not interface:
            raise HTTPException(status_code=404, detail="Interface not found")
        return interface.dict()
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error retrieving interface: {str(e)}")
