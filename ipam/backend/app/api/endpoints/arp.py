from fastapi import APIRouter, Depends, HTTPException, Query
from sqlmodel import Session, select
from typing import List, Optional
from uuid import UUID

from ...database import get_session
from ...models.arp import ARP
from ...schemas.arp import ARPRead

router = APIRouter()

@router.get("/arp_table", response_model=List[ARPRead])
def get_arp_entries(
    skip: int = Query(0, ge=0),
    limit: int = Query(10, ge=1, le=100),
    device_id: Optional[UUID] = None,
    session: Session = Depends(get_session)
):
    """
    Retrieve ARP table entries with optional filtering by device ID.
    """
    query = select(ARP)
    
    # Apply device_id filter if provided
    if device_id:
        query = query.where(ARP.device_id == device_id)
    
    # Apply pagination
    query = query.offset(skip).limit(limit)
    
    # Execute query
    result = session.exec(query).all()
    
    return result

@router.get("/arp_table/{arp_id}", response_model=ARPRead)
def get_arp_entry(
    arp_id: int,
    session: Session = Depends(get_session)
):
    """
    Retrieve a specific ARP table entry by ID.
    """
    arp_entry = session.get(ARP, arp_id)
    if not arp_entry:
        raise HTTPException(status_code=404, detail="ARP entry not found")
    
    return arp_entry
