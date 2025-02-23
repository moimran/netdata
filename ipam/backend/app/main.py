from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from sqlmodel import Session, SQLModel, create_engine, select, inspect
from typing import List, Dict, Any
from . import crud
from .database import engine, get_session
from .models import *
from .config import settings

app = FastAPI(title="IPAM API")

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],  # Frontend development server
    allow_credentials=True,
    allow_methods=["*"],  # Allows all methods
    allow_headers=["*"],  # Allows all headers
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
        # Convert empty string parent_id to None
        if hasattr(item, 'parent_id') and item.parent_id == '':
            item.parent_id = None
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

# Create tables
SQLModel.metadata.create_all(engine)

@app.get("/api/schema/{table_name}")
async def get_table_schema(table_name: str) -> Dict[str, Any]:
    """Get the schema information for a specific table."""
    try:
        # Get the model class for the table
        model_mapping = {
            'regions': Region,
            'site_groups': SiteGroup,
            'sites': Site,
            'locations': Location,
            'vrfs': VRF,
            'rirs': RIR,
            'aggregates': Aggregate,
            'roles': Role,
            'prefixes': Prefix,
            'ip_ranges': IPRange,
            'ip_addresses': IPAddress
        }
        
        if table_name not in model_mapping:
            raise HTTPException(status_code=404, detail=f"Table {table_name} not found")
            
        model = model_mapping[table_name]
        inspector = inspect(engine)
        
        # Get column information
        columns = []
        relationships = []
        
        # Get foreign key information first
        fk_info = {}
        for fk in inspector.get_foreign_keys(model.__tablename__):
            fk_info[fk['constrained_columns'][0]] = {
                'referenced_table': fk['referred_table'],
                'referenced_column': fk['referred_columns'][0]
            }
        
        # Get column information
        for column in inspector.get_columns(model.__tablename__):
            # Convert column type to string representation
            column_type = str(column['type'])
            if hasattr(column['type'], 'python_type'):
                column_type = column['type'].python_type.__name__
            
            # Check if this column is a foreign key
            is_foreign_key = column['name'] in fk_info
            referenced_table = fk_info[column['name']]['referenced_table'] if is_foreign_key else None
            
            column_info = {
                'name': column['name'],
                'type': column_type,
                'nullable': column['nullable'],
                'primary_key': column.get('primary_key', False),
                'default': str(column['default']) if column['default'] is not None else None,
                'is_foreign_key': is_foreign_key,
                'referenced_table': referenced_table,
                'input_type': 'reference' if is_foreign_key else (
                    'datetime-local' if column_type == 'datetime' else
                    'number' if column_type in ('int', 'float') else
                    'text'
                )
            }
            columns.append(column_info)
            
        return {
            'table_name': model.__tablename__,
            'columns': columns,
            'foreign_keys': [
                {
                    'column': col,
                    'references_table': info['referenced_table'],
                    'references_column': info['referenced_column']
                }
                for col, info in fk_info.items()
            ]
        }
    except Exception as e:
        import traceback
        error_details = traceback.format_exc()
        print(f"Error in get_table_schema: {error_details}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/reference-options/{table_name}/{field_name}")
async def get_reference_options(table_name: str, field_name: str, session: Session = Depends(get_session)) -> List[Dict[str, Any]]:
    """Get options for a foreign key reference field."""
    try:
        # Get the model class for the table
        model_mapping = {
            'regions': Region,
            'site_groups': SiteGroup,
            'sites': Site,
            'locations': Location,
            'vrfs': VRF,
            'rirs': RIR,
            'aggregates': Aggregate,
            'roles': Role,
            'prefixes': Prefix,
            'ip_ranges': IPRange,
            'ip_addresses': IPAddress
        }
        
        if table_name not in model_mapping:
            raise HTTPException(status_code=404, detail=f"Table {table_name} not found")
            
        model = model_mapping[table_name]
        
        # Get foreign key information
        inspector = inspect(engine)
        foreign_keys = inspector.get_foreign_keys(model.__tablename__)
        
        # Find the referenced table for this field
        referenced_table = None
        for fk in foreign_keys:
            if field_name in fk['constrained_columns']:
                referenced_table = fk['referred_table']
                break
                
        if not referenced_table:
            raise HTTPException(status_code=404, detail=f"Foreign key {field_name} not found in table {table_name}")
            
        # Get the model for the referenced table
        referenced_model = None
        for model_class in model_mapping.values():
            if model_class.__tablename__ == referenced_table:
                referenced_model = model_class
                break
                
        if not referenced_model:
            raise HTTPException(status_code=404, detail=f"Referenced table {referenced_table} not found")
            
        # Query the referenced table
        items = session.query(referenced_model).all()
        
        # Convert to list of dicts with id and display fields
        return [
            {
                "id": item.id,
                "name": getattr(item, "name", None),
                "slug": getattr(item, "slug", None)
            }
            for item in items
        ]
        
    except Exception as e:
        import traceback
        error_details = traceback.format_exc()
        print(f"Error in get_reference_options: {error_details}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/tables")
async def get_all_tables() -> Dict[str, List[Dict[str, Any]]]:
    """Get all data from all tables."""
    with Session(engine) as session:
        def to_dict(model):
            return {
                col.name: getattr(model, col.name)
                for col in model.__table__.columns
            }

        tables = {
            'regions': [to_dict(item) for item in session.exec(select(Region)).all()],
            'site_groups': [to_dict(item) for item in session.exec(select(SiteGroup)).all()],
            'sites': [to_dict(item) for item in session.exec(select(Site)).all()],
            'locations': [to_dict(item) for item in session.exec(select(Location)).all()],
            'vrfs': [to_dict(item) for item in session.exec(select(VRF)).all()],
            'rirs': [to_dict(item) for item in session.exec(select(RIR)).all()],
            'aggregates': [to_dict(item) for item in session.exec(select(Aggregate)).all()],
            'roles': [to_dict(item) for item in session.exec(select(Role)).all()],
            'prefixes': [to_dict(item) for item in session.exec(select(Prefix)).all()],
            'ip_ranges': [to_dict(item) for item in session.exec(select(IPRange)).all()],
            'ip_addresses': [to_dict(item) for item in session.exec(select(IPAddress)).all()]
        }
        return tables

# Mount the API router under /api/v1
app.mount("/api/v1", api_router)
