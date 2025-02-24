from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class SiteBase(BaseModel):
    name: str
    slug: str
    status: str
    region_id: Optional[int] = None
    site_group_id: Optional[int] = None

class SiteCreate(SiteBase):
    pass

class SiteUpdate(SiteBase):
    name: Optional[str] = None
    slug: Optional[str] = None
    status: Optional[str] = None

class SiteResponse(SiteBase):
    id: int
    created_at: datetime

    class Config:
        orm_mode = True
