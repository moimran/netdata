from fastapi import FastAPI, HTTPException, Depends, Query, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from fastapi.routing import APIRouter
from sqlmodel import Session, SQLModel, create_engine, select, inspect
from typing import List, Dict, Any, Optional, Union
from . import crud
from .database import engine, get_session
from .models import *
from .config import settings
from pydantic import BaseModel
import logging
import time
import json
from starlette.middleware.base import BaseHTTPMiddleware

# Configure logging
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

# Define a generic paginated response model
class PaginatedResponse(BaseModel):
    items: List[Any]
    total: int
    page: int
    size: int

# Create a middleware class to log requests and responses
class LoggingMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        # Log request
        request_id = str(time.time())
        logger.debug(f"Request {request_id}: {request.method} {request.url}")
        
        # Try to log request body for POST/PUT requests
        if request.method in ["POST", "PUT"]:
            try:
                # We can't read the body directly as it will consume the stream
                # Just log that there's a body
                logger.debug(f"Request {request_id} has a body (not logged to avoid consuming stream)")
            except Exception as e:
                logger.error(f"Error with request body: {str(e)}")
        
        # Log query params for all requests
        logger.debug(f"Request {request_id} query params: {request.query_params}")
        
        # Process the request
        start_time = time.time()
        response = await call_next(request)
        process_time = time.time() - start_time
        
        # Log response
        logger.debug(f"Response {request_id}: status={response.status_code}, time={process_time:.4f}s")
        
        return response

app = FastAPI(title="IPAM API")

# Add logging middleware
app.add_middleware(LoggingMiddleware)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:9001"],  # Frontend development server
    allow_credentials=True,
    allow_methods=["*"],  # Allows all methods
    allow_headers=["*"],  # Allows all headers
)

# Add exception handlers
@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    """
    Handle validation errors and log them in detail
    """
    # Log the error details
    error_details = exc.errors()
    logger.error(f"Validation error: {str(exc)}")
    logger.error(f"Validation error details: {error_details}")
    
    # Create a more user-friendly error message
    user_friendly_errors = []
    for error in error_details:
        loc = " -> ".join([str(l) for l in error.get("loc", [])])
        msg = error.get("msg", "")
        typ = error.get("type", "")
        user_friendly_errors.append(f"Location: {loc}, Message: {msg}, Type: {typ}")
    
    # Log the request details
    logger.error(f"Request URL: {request.url}")
    logger.error(f"Request method: {request.method}")
    logger.error(f"Request query params: {request.query_params}")
    logger.error(f"Request headers: {dict(request.headers)}")
    
    # Try to get the request body without consuming the stream
    try:
        body = "Could not read body"
        if request.method in ["POST", "PUT"]:
            body = "Request has a body (not shown to avoid consuming stream)"
    except Exception as e:
        body = f"Error reading body: {str(e)}"
    
    logger.error(f"Request body: {body}")
    
    # Return a more detailed error response
    return JSONResponse(
        status_code=422,
        content={
            "detail": error_details,
            "user_friendly_errors": user_friendly_errors,
            "url": str(request.url),
            "method": request.method,
            "query_params": str(request.query_params)
        }
    )

# Create API router with /api/v1 prefix
api_router = APIRouter()

# Generic CRUD endpoints for each model
def create_crud_routes(router: APIRouter, path: str, crud_instance, model_type):
    @router.get(f"/{path}", response_model=PaginatedResponse)
    def get_all(
        skip: int = Query(0, ge=0),
        limit: int = Query(20, ge=1, le=100),
        search: Optional[str] = None,
        session: Session = Depends(get_session),
        request: Request = None,
    ):
        # Log all parameters for debugging
        logger.debug(f"GET /{path} - Parameters: skip={skip}, limit={limit}, search={search}")
        
        try:
            # Get all query parameters
            query_params = dict(request.query_params)
            # Remove known parameters
            known_params = ["skip", "limit", "search"]
            filter_params = {k: v for k, v in query_params.items() if k not in known_params}
            
            logger.debug(f"GET /{path} - Model fields: {[col.name for col in model_type.__table__.columns]}")
            logger.debug(f"GET /{path} - Filter params: {filter_params}")
            
            # Check if any filter parameters don't exist on the model
            invalid_params = [k for k in filter_params.keys() if not hasattr(model_type, k)]
            if invalid_params:
                logger.warning(f"GET /{path} - Invalid filter parameters: {invalid_params}")
                # Remove invalid parameters
                filter_params = {k: v for k, v in filter_params.items() if k not in invalid_params}
            
            # Get items with pagination and filtering
            items = crud_instance.get_all(session, skip=skip, limit=limit, **filter_params)
            
            # Count total items (without pagination)
            query = select(model_type)
            for key, value in filter_params.items():
                if hasattr(model_type, key):
                    query = query.where(getattr(model_type, key) == value)
                else:
                    logger.warning(f"GET /{path} - Model {model_type.__name__} does not have attribute {key}")
            total = len(session.exec(query).all())
            
            logger.debug(f"GET /{path} - Found {len(items)} items, total: {total}")
            
            return {
                "items": items,
                "total": total,
                "page": skip // limit + 1,
                "size": limit
            }
        except Exception as e:
            logger.error(f"Error in GET /{path}: {str(e)}", exc_info=True)  # Add exc_info for stack trace
            raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

    @router.get(f"/{path}/{{item_id}}", response_model=model_type)
    def get_one(item_id: int, session: Session = Depends(get_session)):
        item = crud_instance.get_by_id(session, item_id)
        if not item:
            raise HTTPException(status_code=404, detail=f"{path} not found")
        return item

    @router.post(f"/{path}", response_model=model_type, status_code=201)
    def create_item(item: Dict[str, Any], session: Session = Depends(get_session)):
        # Convert empty strings to None for fields that should be integers or floats
        for key, value in item.items():
            if value == "":
                # Check if the field is an integer or float by looking at the model's __annotations__
                field_type = getattr(model_type, "__annotations__", {}).get(key, None)
                # Simple check for int and float types
                if field_type in (int, float):
                    item[key] = None
                # Check for Optional[int] and Optional[float]
                elif field_type is not None and hasattr(field_type, "__origin__"):
                    try:
                        if field_type.__origin__ is Union and any(arg in (int, float) for arg in field_type.__args__):
                            item[key] = None
                    except (AttributeError, TypeError):
                        # If any error occurs during type checking, keep the original value
                        pass
        
        return crud_instance.create(session, item)

    @router.put(f"/{path}/{{item_id}}", response_model=model_type)
    def update_item(item_id: int, item: Dict[str, Any], session: Session = Depends(get_session)):
        # Convert empty strings to None for fields that should be integers or floats
        for key, value in item.items():
            if value == "":
                # Check if the field is an integer or float by looking at the model's __annotations__
                field_type = getattr(model_type, "__annotations__", {}).get(key, None)
                # Simple check for int and float types
                if field_type in (int, float):
                    item[key] = None
                # Check for Optional[int] and Optional[float]
                elif field_type is not None and hasattr(field_type, "__origin__"):
                    try:
                        if field_type.__origin__ is Union and any(arg in (int, float) for arg in field_type.__args__):
                            item[key] = None
                    except (AttributeError, TypeError):
                        # If any error occurs during type checking, keep the original value
                        pass
        
        updated_item = crud_instance.update(session, item_id, item)
        if not updated_item:
            raise HTTPException(status_code=404, detail=f"Item with id {item_id} not found")
        return updated_item

    @router.delete(f"/{path}/{{item_id}}", status_code=204)
    def delete_item(item_id: int, session: Session = Depends(get_session)):
        success = crud_instance.delete(session, item_id)
        if not success:
            raise HTTPException(status_code=404, detail=f"Item with id {item_id} not found")
        return None

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
create_crud_routes(api_router, "tenants", crud.tenant, Tenant)
create_crud_routes(api_router, "devices", crud.device, Device)
create_crud_routes(api_router, "interfaces", crud.interface, Interface)
create_crud_routes(api_router, "vlans", crud.vlan, VLAN)

# Specialized endpoints

# Get prefix counts for each VRF
@api_router.get("/vrfs/prefix-counts", response_model=Dict[int, int])
def get_vrf_prefix_counts(session: Session = Depends(get_session)):
    """
    Get the count of prefixes for each VRF.
    Returns a dictionary with VRF IDs as keys and prefix counts as values.
    """
    vrfs = session.exec(select(VRF)).all()
    result = {}
    
    for vrf in vrfs:
        # Count prefixes for this VRF
        query = select(Prefix).where(Prefix.vrf_id == vrf.id)
        count = len(session.exec(query).all())
        result[vrf.id] = count
    
    return result

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
app.include_router(api_router, prefix="/api/v1")

# Add a simple test endpoint
@app.get("/api/test")
async def test_endpoint():
    """
    A simple test endpoint to verify that the API is working correctly.
    """
    logger.debug("Test endpoint called")
    return {"status": "ok", "message": "API is working correctly"}
