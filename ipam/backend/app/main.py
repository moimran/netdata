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
from ipaddress import IPv4Network, IPv6Network
from .serializers import jsonable_encoder, model_to_dict
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

# Override FastAPI's default JSONResponse to use our custom encoder
class CustomJSONResponse(JSONResponse):
    def render(self, content: Any) -> bytes:
        return json.dumps(
            content,
            ensure_ascii=False,
            allow_nan=False,
            indent=None,
            separators=(",", ":"),
            cls=json.JSONEncoder,
            default=lambda o: str(o) if isinstance(o, (IPv4Network, IPv6Network)) else None,
        ).encode("utf-8")

# Use our custom response class as the default
app.router.default_response_class = CustomJSONResponse

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
    
    return JSONResponse(
        status_code=422,
        content={"detail": user_friendly_errors},
    )

# Create API router with /api/v1 prefix
api_router = APIRouter()

# Generic CRUD endpoints for each model
def create_crud_routes(router: APIRouter, path: str, crud_instance, model_type):
    @router.get(f"/{path}")
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
            
            # Convert items to dictionaries with proper serialization
            serialized_items = model_to_dict(items)
            
            return {
                "items": serialized_items,
                "total": total,
                "page": skip // limit + 1,
                "size": limit
            }
        except Exception as e:
            logger.error(f"Error in GET /{path}: {str(e)}", exc_info=True)  # Add exc_info for stack trace
            raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

    @router.get(f"/{path}/{{item_id}}")
    def get_one(item_id: int, session: Session = Depends(get_session)):
        item = crud_instance.get_by_id(session, item_id)
        if not item:
            raise HTTPException(status_code=404, detail=f"{path} not found")
        
        # Convert item to dictionary with proper serialization
        serialized_item = model_to_dict(item)
        return serialized_item

    @router.post(f"/{path}", status_code=201)
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
        
        created_item = crud_instance.create(session, item)
        # Convert created item to dictionary with proper serialization
        serialized_item = model_to_dict(created_item)
        return serialized_item

    @router.put(f"/{path}/{{item_id}}")
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
        
        # Convert updated item to dictionary with proper serialization
        serialized_item = model_to_dict(updated_item)
        return serialized_item

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
create_crud_routes(api_router, "asns", crud.asn, ASN)
create_crud_routes(api_router, "asn_ranges", crud.asn_range, ASNRange)

# Specialized endpoints

# Get available IP addresses in a prefix
@api_router.get("/prefixes/{prefix_id}/available-ips")
def get_available_ips(
    prefix_id: int,
    limit: int = Query(100, ge=1, le=1000),
    session: Session = Depends(get_session)
):
    pass

# Add a VRF prefix counts endpoint before including the API router
@app.get("/api/v1/vrfs/prefix-counts", tags=["VRFs"])
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
    
    return model_to_dict(result)

# Mount the API router under /api/v1
app.include_router(api_router, prefix="/api/v1")

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
            'ip_addresses': IPAddress,
            'tenants': Tenant,
            'devices': Device,
            'interfaces': Interface,
            'vlans': VLAN
        }
        
        if table_name not in model_mapping:
            raise HTTPException(status_code=404, detail=f"Table {table_name} not found")
        
        model_class = model_mapping[table_name]
        
        # Get table information
        inspector = inspect(engine)
        columns = inspector.get_columns(table_name)
        
        # Get foreign keys
        foreign_keys = inspector.get_foreign_keys(table_name)
        
        # Build schema information
        schema = {
            "table_name": table_name,
            "columns": [],
            "foreign_keys": []
        }
        
        # Add column information
        for column in columns:
            col_info = {
                "name": column["name"],
                "type": str(column["type"]),
                "nullable": column["nullable"],
                "default": str(column["default"]) if column["default"] is not None else None,
                "primary_key": column.get("primary_key", False)
            }
            schema["columns"].append(col_info)
        
        # Add foreign key information
        for fk in foreign_keys:
            fk_info = {
                "constrained_columns": fk["constrained_columns"],
                "referred_table": fk["referred_table"],
                "referred_columns": fk["referred_columns"]
            }
            schema["foreign_keys"].append(fk_info)
        
        return model_to_dict(schema)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error getting schema: {str(e)}")

@app.get("/api/reference/{table_name}/{field_name}")
async def get_reference_options(table_name: str, field_name: str, session: Session = Depends(get_session)):
    """
    Get options for a foreign key reference field.
    """
    try:
        # Define mappings for reference fields
        reference_mappings = {
            # Table -> Field -> (Referenced Table, CRUD instance, Display Field)
            "sites": {
                "region_id": ("regions", crud.region, "name"),
                "site_group_id": ("site_groups", crud.site_group, "name"),
                "tenant_id": ("tenants", crud.tenant, "name")
            },
            "locations": {
                "site_id": ("sites", crud.site, "name"),
                "parent_id": ("locations", crud.location, "name"),
                "tenant_id": ("tenants", crud.tenant, "name")
            },
            "prefixes": {
                "site_id": ("sites", crud.site, "name"),
                "vrf_id": ("vrfs", crud.vrf, "name"),
                "tenant_id": ("tenants", crud.tenant, "name"),
                "vlan_id": ("vlans", crud.vlan, "name"),
                "role_id": ("roles", crud.role, "name")
            },
            "ip_addresses": {
                "prefix_id": ("prefixes", crud.prefix, "prefix"),
                "interface_id": ("interfaces", crud.interface, "name"),
                "tenant_id": ("tenants", crud.tenant, "name"),
                "vrf_id": ("vrfs", crud.vrf, "name")
            },
            "ip_ranges": {
                "prefix_id": ("prefixes", crud.prefix, "prefix"),
                "tenant_id": ("tenants", crud.tenant, "name"),
                "vrf_id": ("vrfs", crud.vrf, "name"),
                "role_id": ("roles", crud.role, "name")
            },
            "aggregates": {
                "rir_id": ("rirs", crud.rir, "name"),
                "tenant_id": ("tenants", crud.tenant, "name")
            },
            "interfaces": {
                "device_id": ("devices", crud.device, "name")
            },
            "vlans": {
                "site_id": ("sites", crud.site, "name"),
                "tenant_id": ("tenants", crud.tenant, "name"),
                "role_id": ("roles", crud.role, "name")
            }
        }
        
        if table_name not in reference_mappings:
            raise HTTPException(status_code=404, detail=f"No reference mappings for table {table_name}")
        
        if field_name not in reference_mappings[table_name]:
            raise HTTPException(status_code=404, detail=f"No reference mapping for field {field_name} in table {table_name}")
        
        ref_table, crud_instance, display_field = reference_mappings[table_name][field_name]
        
        # Get all options from the referenced table
        options = crud_instance.get_all(session)
        
        # Format options for display
        formatted_options = []
        for option in options:
            option_dict = model_to_dict(option)
            formatted_options.append({
                "id": option_dict["id"],
                "label": option_dict.get(display_field, f"ID: {option_dict['id']}")
            })
        
        return model_to_dict(formatted_options)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error getting reference options: {str(e)}")

@app.get("/api/all-tables")
async def get_all_tables():
    """
    Get all data from all tables.
    """
    try:
        # Define the tables we want to get data from
        tables = [
            "regions", "site_groups", "sites", "locations", "vrfs", "rirs", 
            "aggregates", "roles", "prefixes", "ip_ranges", "ip_addresses", 
            "tenants", "devices", "interfaces", "vlans"
        ]
        
        # Get the base URL
        base_url = "/api/v1"
        
        # Create a dictionary of URLs for each table
        urls = {table: f"{base_url}/{table}" for table in tables}
        
        return model_to_dict(urls)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error getting tables: {str(e)}")

# Add a simple test endpoint
@app.get("/api/test")
async def test_endpoint():
    """
    A simple test endpoint to verify that the API is working correctly.
    """
    from ipaddress import IPv4Network, IPv6Network
    from .serializers import model_to_dict
    
    # Create test objects with IP networks
    test_data = {
        "ipv4_network": IPv4Network("192.168.1.0/24"),
        "ipv6_network": IPv6Network("2001:db8::/64"),
        "string": "This is a string",
        "number": 42,
        "boolean": True,
        "none": None,
        "list": [
            IPv4Network("10.0.0.0/8"),
            IPv4Network("172.16.0.0/12"),
            IPv4Network("192.168.0.0/16")
        ],
        "nested": {
            "ipv4": IPv4Network("192.168.2.0/24"),
            "ipv6": IPv6Network("2001:db8:1::/64")
        }
    }
    
    # Serialize the test data
    serialized_data = model_to_dict(test_data)
    
    return serialized_data
