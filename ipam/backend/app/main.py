from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from sqlmodel import Session
from typing import List
from . import crud
from .database import get_session
from .models import *

app = FastAPI(title="IPAM API")

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],  # React dev server
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Create API router with /api/v1 prefix
api_router = FastAPI(title="IPAM API v1")

# Generic CRUD endpoints for each model
def create_crud_routes(router: FastAPI, path: str, crud_instance, model_type):
    @router.get(f"/{path}", response_model=List[model_type])
    def get_all(session: Session = Depends(get_session)):
        return crud_instance.get_all(session)

    @router.get(f"/{path}/{{item_id}}", response_model=model_type)
    def get_one(item_id: int, session: Session = Depends(get_session)):
        item = crud_instance.get_by_id(session, item_id)
        if not item:
            raise HTTPException(status_code=404, detail=f"{path} not found")
        return item

    @router.post(f"/{path}", response_model=model_type)
    def create(item: model_type, session: Session = Depends(get_session)):
        return crud_instance.create(session, item)

    @router.put(f"/{path}/{{item_id}}", response_model=model_type)
    def update(item_id: int, item: model_type, session: Session = Depends(get_session)):
        db_item = crud_instance.get_by_id(session, item_id)
        if not db_item:
            raise HTTPException(status_code=404, detail=f"{path} not found")
        return crud_instance.update(session, db_item, item)

    @router.delete(f"/{path}/{{item_id}}")
    def delete(item_id: int, session: Session = Depends(get_session)):
        db_item = crud_instance.get_by_id(session, item_id)
        if not db_item:
            raise HTTPException(status_code=404, detail=f"{path} not found")
        crud_instance.delete(session, db_item)
        return {"ok": True}

# Create routes for all models
create_crud_routes(api_router, "regions", crud.region, Region)
create_crud_routes(api_router, "site_groups", crud.site_group, SiteGroup)
create_crud_routes(api_router, "sites", crud.site, Site)
create_crud_routes(api_router, "locations", crud.location, Location)
create_crud_routes(api_router, "vrfs", crud.vrf, VRF)
create_crud_routes(api_router, "rirs", crud.rir, RIR)
create_crud_routes(api_router, "aggregates", crud.aggregate, Aggregate)
create_crud_routes(api_router, "roles", crud.role, Role)
create_crud_routes(api_router, "prefixes", crud.prefix, Prefix)
create_crud_routes(api_router, "ip_ranges", crud.ip_range, IPRange)
create_crud_routes(api_router, "ip_addresses", crud.ip_address, IPAddress)

# Mount the API router under /api/v1
app.mount("/api/v1", api_router)
