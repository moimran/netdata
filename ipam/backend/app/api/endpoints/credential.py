from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select

from app.database import get_session
from app.models.credential import Credential
from app.models.device import Device

router = APIRouter()

@router.post("/credentials/", response_model=Credential)
def create_credential(credential: Credential, session: Session = Depends(get_session)):
    # Check if credential with same name exists
    existing = session.exec(select(Credential).where(Credential.name == credential.name)).first()
    if existing:
        raise HTTPException(status_code=400, detail="Credential with this name already exists")
    
    session.add(credential)
    session.commit()
    session.refresh(credential)
    return credential

@router.get("/credentials/", response_model=List[Credential])
def read_credentials(session: Session = Depends(get_session)):
    credentials = session.exec(select(Credential)).all()
    return credentials

@router.get("/credentials/{name}", response_model=Credential)
def read_credential(name: str, session: Session = Depends(get_session)):
    credential = session.exec(select(Credential).where(Credential.name == name)).first()
    if not credential:
        raise HTTPException(status_code=404, detail="Credential not found")
    return credential

@router.put("/credentials/{name}", response_model=Credential)
def update_credential(name: str, credential: Credential, session: Session = Depends(get_session)):
    db_credential = session.exec(select(Credential).where(Credential.name == name)).first()
    if not db_credential:
        raise HTTPException(status_code=404, detail="Credential not found")
    
    # Update fields
    db_credential.username = credential.username
    db_credential.password = credential.password
    db_credential.enable_password = credential.enable_password
    db_credential.is_default = credential.is_default
    
    session.add(db_credential)
    session.commit()
    session.refresh(db_credential)
    return db_credential

@router.delete("/credentials/{name}")
def delete_credential(name: str, session: Session = Depends(get_session)):
    credential = session.exec(select(Credential).where(Credential.name == name)).first()
    if not credential:
        raise HTTPException(status_code=404, detail="Credential not found")
    
    # Check if credential is in use
    devices = session.exec(
        select(Device).where(
            (Device.credential_name == name) | 
            (Device.fallback_credential_name == name)
        )
    ).all()
    
    if devices:
        raise HTTPException(
            status_code=400,
            detail="Cannot delete credential - it is in use by devices"
        )
    
    session.delete(credential)
    session.commit()
    return {"ok": True}
