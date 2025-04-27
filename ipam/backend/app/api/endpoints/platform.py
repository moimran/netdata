from fastapi import APIRouter, Depends, HTTPException, Query
from sqlmodel import Session, select
from typing import List, Optional

from ...database import get_session
from ...models.platform import PlatformType

router = APIRouter()

@router.get("/platform_types", response_model=List[dict])
def get_platform_types(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    session: Session = Depends(get_session)
):
    """
    Retrieve platform types with pagination.
    """
    try:
        # Since PlatformTypeCRUD doesn't have a get_all method, we'll implement it directly here
        query = select(PlatformType).offset(skip).limit(limit)
        result = session.exec(query).all()
        
        # Convert to dictionaries for the response
        return [platform.dict() for platform in result]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error retrieving platform types: {str(e)}")

@router.get("/platform_types/{platform_id}", response_model=dict)
def get_platform_type_by_id(
    platform_id: str,
    session: Session = Depends(get_session)
):
    """
    Retrieve a specific platform type by ID.
    """
    try:
        platform = session.get(PlatformType, platform_id)
        if not platform:
            raise HTTPException(status_code=404, detail="Platform type not found")
        return platform.dict()
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error retrieving platform type: {str(e)}")
