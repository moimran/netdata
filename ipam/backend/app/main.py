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
import ipaddress
from ipaddress import IPv4Network, IPv6Network
from .serializers import jsonable_encoder, model_to_dict
import logging
import time
import json
from starlette.middleware.base import BaseHTTPMiddleware
import re

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
    allow_origins=["http://localhost:5173"],  # Specifically allow the frontend origin
    allow_credentials=True,  # Allow credentials
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],  # Specify allowed methods
    allow_headers=["*"],  # Allows all headers
    expose_headers=["Content-Type", "X-Requested-With", "Accept", "Authorization"],  # Expose specific headers
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

@app.exception_handler(Exception)
async def general_exception_handler(request: Request, exc: Exception):
    """
    Handle all other exceptions and provide user-friendly error messages
    """
    # Log the error
    logger.error(f"Unhandled exception: {str(exc)}", exc_info=True)
    
    # Check for specific database errors
    error_message = str(exc)
    status_code = 500
    
    # Handle unique constraint violations
    if "UniqueViolation" in error_message or "duplicate key" in error_message:
        status_code = 409  # Conflict
        
        try:
            # Extract the DETAIL section which contains the values
            if "DETAIL:" in error_message:
                detail_match = error_message.split("DETAIL:")[1].strip()
                
                # Handle prefix and VRF uniqueness constraint
                if "Key (prefix, vrf_id)" in detail_match and "=" in detail_match:
                    values_match = detail_match.split("=")[1].strip()
                    
                    # Parse the values to get prefix and VRF ID
                    if "(" in values_match and ")" in values_match:
                        values_content = values_match.strip("()").split(",")
                        if len(values_content) >= 2:
                            prefix_value = values_content[0].strip()
                            vrf_id = values_content[1].strip()
                            
                            # Get VRF name if possible
                            vrf_name = "Unknown VRF"
                            try:
                                with Session(engine) as session:
                                    vrf = session.get(VRF, int(vrf_id))
                                    if vrf:
                                        vrf_name = vrf.name
                            except Exception as e:
                                logger.error(f"Error getting VRF name: {str(e)}")
                            
                            return JSONResponse(
                                status_code=status_code,
                                content={
                                    "detail": f"The prefix {prefix_value} already exists in {vrf_name}. Please use a different prefix or VRF.",
                                    "error_type": "unique_violation",
                                    "constraint": "uq_prefix_vrf",
                                    "prefix": prefix_value,
                                    "vrf_id": vrf_id,
                                    "vrf_name": vrf_name
                                }
                            )
                
                # Handle IP address and VRF uniqueness constraint
                elif "Key (address, vrf_id)" in detail_match and "=" in detail_match:
                    values_match = detail_match.split("=")[1].strip()
                    
                    # Parse the values to get address and VRF ID
                    if "(" in values_match and ")" in values_match:
                        values_content = values_match.strip("()").split(",")
                        if len(values_content) >= 2:
                            address_value = values_content[0].strip()
                            vrf_id = values_content[1].strip()
                            
                            # Get VRF name if possible
                            vrf_name = "Unknown VRF"
                            try:
                                with Session(engine) as session:
                                    vrf = session.get(VRF, int(vrf_id))
                                    if vrf:
                                        vrf_name = vrf.name
                            except Exception as e:
                                logger.error(f"Error getting VRF name: {str(e)}")
                            
                            return JSONResponse(
                                status_code=status_code,
                                content={
                                    "detail": f"The IP address {address_value} already exists in {vrf_name}. Please use a different IP address or VRF.",
                                    "error_type": "unique_violation",
                                    "constraint": "uq_ipaddress_vrf",
                                    "address": address_value,
                                    "vrf_id": vrf_id,
                                    "vrf_name": vrf_name
                                }
                            )
                
                # Handle VLAN VID and site uniqueness constraint
                elif "Key (vid, site_id)" in detail_match and "=" in detail_match:
                    values_match = detail_match.split("=")[1].strip()
                    
                    # Parse the values to get VID and site ID
                    if "(" in values_match and ")" in values_match:
                        values_content = values_match.strip("()").split(",")
                        if len(values_content) >= 2:
                            vid_value = values_content[0].strip()
                            site_id = values_content[1].strip()
                            
                            # Get site name if possible
                            site_name = "Unknown Site"
                            try:
                                with Session(engine) as session:
                                    site = session.get(Site, int(site_id))
                                    if site:
                                        site_name = site.name
                            except Exception as e:
                                logger.error(f"Error getting Site name: {str(e)}")
                            
                            return JSONResponse(
                                status_code=status_code,
                                content={
                                    "detail": f"VLAN with VID {vid_value} already exists at site {site_name}. Please use a different VID or site.",
                                    "error_type": "unique_violation",
                                    "constraint": "uq_vlan_vid_site",
                                    "vid": vid_value,
                                    "site_id": site_id,
                                    "site_name": site_name
                                }
                            )
                
                # Handle VLAN VID and group uniqueness constraint
                elif "Key (vid, group_id)" in detail_match and "=" in detail_match:
                    values_match = detail_match.split("=")[1].strip()
                    
                    # Parse the values to get VID and group ID
                    if "(" in values_match and ")" in values_match:
                        values_content = values_match.strip("()").split(",")
                        if len(values_content) >= 2:
                            vid_value = values_content[0].strip()
                            group_id = values_content[1].strip()
                            
                            # Get group name if possible
                            group_name = "Unknown Group"
                            try:
                                with Session(engine) as session:
                                    group = session.get(VLANGroup, int(group_id))
                                    if group:
                                        group_name = group.name
                            except Exception as e:
                                logger.error(f"Error getting VLAN Group name: {str(e)}")
                            
                            return JSONResponse(
                                status_code=status_code,
                                content={
                                    "detail": f"VLAN with VID {vid_value} already exists in group {group_name}. Please use a different VID or group.",
                                    "error_type": "unique_violation",
                                    "constraint": "uq_vlan_vid_group",
                                    "vid": vid_value,
                                    "group_id": group_id,
                                    "group_name": group_name
                                }
                            )
                
                # Handle VLAN name and site uniqueness constraint
                elif "Key (name, site_id)" in detail_match and "=" in detail_match:
                    values_match = detail_match.split("=")[1].strip()
                    
                    # Parse the values to get name and site ID
                    if "(" in values_match and ")" in values_match:
                        values_content = values_match.strip("()").split(",")
                        if len(values_content) >= 2:
                            name_value = values_content[0].strip()
                            site_id = values_content[1].strip()
                            
                            # Get site name if possible
                            site_name = "Unknown Site"
                            try:
                                with Session(engine) as session:
                                    site = session.get(Site, int(site_id))
                                    if site:
                                        site_name = site.name
                            except Exception as e:
                                logger.error(f"Error getting Site name: {str(e)}")
                            
                            return JSONResponse(
                                status_code=status_code,
                                content={
                                    "detail": f"VLAN with name '{name_value}' already exists at site {site_name}. Please use a different name or site.",
                                    "error_type": "unique_violation",
                                    "constraint": "uq_vlan_name_site",
                                    "name": name_value,
                                    "site_id": site_id,
                                    "site_name": site_name
                                }
                            )
                
                # Handle VLAN name and group uniqueness constraint
                elif "Key (name, group_id)" in detail_match and "=" in detail_match:
                    values_match = detail_match.split("=")[1].strip()
                    
                    # Parse the values to get name and group ID
                    if "(" in values_match and ")" in values_match:
                        values_content = values_match.strip("()").split(",")
                        if len(values_content) >= 2:
                            name_value = values_content[0].strip()
                            group_id = values_content[1].strip()
                            
                            # Get group name if possible
                            group_name = "Unknown Group"
                            try:
                                with Session(engine) as session:
                                    group = session.get(VLANGroup, int(group_id))
                                    if group:
                                        group_name = group.name
                            except Exception as e:
                                logger.error(f"Error getting VLAN Group name: {str(e)}")
                            
                            return JSONResponse(
                                status_code=status_code,
                                content={
                                    "detail": f"VLAN with name '{name_value}' already exists in group {group_name}. Please use a different name or group.",
                                    "error_type": "unique_violation",
                                    "constraint": "uq_vlan_name_group",
                                    "name": name_value,
                                    "group_id": group_id,
                                    "group_name": group_name
                                }
                            )
                
                # Handle ASN uniqueness constraint
                elif "Key (asn)" in detail_match and "=" in detail_match:
                    values_match = detail_match.split("=")[1].strip()
                    asn_value = values_match.strip()
                    
                    return JSONResponse(
                        status_code=status_code,
                        content={
                            "detail": f"ASN {asn_value} already exists. Please use a different ASN.",
                            "error_type": "unique_violation",
                            "constraint": "asn_asn_key",
                            "asn": asn_value
                        }
                    )
                
                # Handle VRF name uniqueness constraint
                elif "Key (name)" in detail_match and "=" in detail_match and "vrf_name_key" in error_message:
                    values_match = detail_match.split("=")[1].strip()
                    name_value = values_match.strip()
                    
                    return JSONResponse(
                        status_code=status_code,
                        content={
                            "detail": f"VRF with name '{name_value}' already exists. Please use a different name.",
                            "error_type": "unique_violation",
                            "constraint": "vrf_name_key",
                            "name": name_value
                        }
                    )
                
                # Handle VRF RD uniqueness constraint
                elif "Key (rd)" in detail_match and "=" in detail_match:
                    values_match = detail_match.split("=")[1].strip()
                    rd_value = values_match.strip()
                    
                    return JSONResponse(
                        status_code=status_code,
                        content={
                            "detail": f"VRF with Route Distinguisher '{rd_value}' already exists. Please use a different RD.",
                            "error_type": "unique_violation",
                            "constraint": "vrf_rd_key",
                            "rd": rd_value
                        }
                    )
                
                # Handle IP Range uniqueness constraint
                elif "Key (start_address, end_address, vrf_id)" in detail_match and "=" in detail_match:
                    values_match = detail_match.split("=")[1].strip()
                    
                    # Parse the values to get start_address, end_address and VRF ID
                    if "(" in values_match and ")" in values_match:
                        values_content = values_match.strip("()").split(",")
                        if len(values_content) >= 3:
                            start_address = values_content[0].strip()
                            end_address = values_content[1].strip()
                            vrf_id = values_content[2].strip()
                            
                            # Get VRF name if possible
                            vrf_name = "Unknown VRF"
                            try:
                                with Session(engine) as session:
                                    vrf = session.get(VRF, int(vrf_id))
                                    if vrf:
                                        vrf_name = vrf.name
                            except Exception as e:
                                logger.error(f"Error getting VRF name: {str(e)}")
                            
                            return JSONResponse(
                                status_code=status_code,
                                content={
                                    "detail": f"IP Range {start_address}-{end_address} already exists in {vrf_name}. Please use a different range or VRF.",
                                    "error_type": "unique_violation",
                                    "constraint": "uq_iprange_vrf",
                                    "start_address": start_address,
                                    "end_address": end_address,
                                    "vrf_id": vrf_id,
                                    "vrf_name": vrf_name
                                }
                            )
                
                # Handle ASN Range uniqueness constraint
                elif "Key (start, end, rir_id)" in detail_match and "=" in detail_match:
                    values_match = detail_match.split("=")[1].strip()
                    
                    # Parse the values to get start, end and RIR ID
                    if "(" in values_match and ")" in values_match:
                        values_content = values_match.strip("()").split(",")
                        if len(values_content) >= 3:
                            start_value = values_content[0].strip()
                            end_value = values_content[1].strip()
                            rir_id = values_content[2].strip()
                            
                            # Get RIR name if possible
                            rir_name = "Unknown RIR"
                            try:
                                with Session(engine) as session:
                                    rir = session.get(RIR, int(rir_id))
                                    if rir:
                                        rir_name = rir.name
                            except Exception as e:
                                logger.error(f"Error getting RIR name: {str(e)}")
                            
                            return JSONResponse(
                                status_code=status_code,
                                content={
                                    "detail": f"ASN Range {start_value}-{end_value} already exists in {rir_name}. Please use a different range or RIR.",
                                    "error_type": "unique_violation",
                                    "constraint": "uq_asnrange_rir",
                                    "start": start_value,
                                    "end": end_value,
                                    "rir_id": rir_id,
                                    "rir_name": rir_name
                                }
                            )
                
                # Handle Region name uniqueness constraint
                elif "Key (name)" in detail_match and "=" in detail_match and "uq_region_name" in error_message:
                    values_match = detail_match.split("=")[1].strip()
                    name_value = values_match.strip()
                    
                    return JSONResponse(
                        status_code=status_code,
                        content={
                            "detail": f"Region with name '{name_value}' already exists. Please use a different name.",
                            "error_type": "unique_violation",
                            "constraint": "uq_region_name",
                            "name": name_value
                        }
                    )
                
                # Handle Device name uniqueness constraint
                elif "Key (name)" in detail_match and "=" in detail_match and "uq_device_name" in error_message:
                    values_match = detail_match.split("=")[1].strip()
                    name_value = values_match.strip()
                    
                    return JSONResponse(
                        status_code=status_code,
                        content={
                            "detail": f"Device with name '{name_value}' already exists. Please use a different name.",
                            "error_type": "unique_violation",
                            "constraint": "uq_device_name",
                            "name": name_value
                        }
                    )
                
                # Handle Interface name uniqueness constraint
                elif "Key (name, device_id)" in detail_match and "=" in detail_match and "uq_interface_name_device" in error_message:
                    values_match = detail_match.split("=")[1].strip()
                    
                    # Parse the values to get name and device ID
                    if "(" in values_match and ")" in values_match:
                        values_content = values_match.strip("()").split(",")
                        if len(values_content) >= 2:
                            name_value = values_content[0].strip()
                            device_id = values_content[1].strip()
                            
                            # Get device name if possible
                            device_name = "Unknown Device"
                            try:
                                with Session(engine) as session:
                                    device = session.get(Device, int(device_id))
                                    if device:
                                        device_name = device.name
                            except Exception as e:
                                logger.error(f"Error getting Device name: {str(e)}")
                            
                            return JSONResponse(
                                status_code=status_code,
                                content={
                                    "detail": f"Interface with name '{name_value}' already exists on device {device_name}. Please use a different name.",
                                    "error_type": "unique_violation",
                                    "constraint": "uq_interface_name_device",
                                    "name": name_value,
                                    "device_id": device_id,
                                    "device_name": device_name
                                }
                            )
        except Exception as parse_error:
            logger.error(f"Error parsing UniqueViolation details: {str(parse_error)}")
        
        # Extract constraint name if available
        constraint_name = None
        if "constraint" in error_message:
            try:
                constraint_match = re.search(r'constraint "([^"]+)"', error_message)
                if constraint_match:
                    constraint_name = constraint_match.group(1)
            except Exception as e:
                logger.error(f"Error extracting constraint name: {str(e)}")
        
        # Generic unique constraint error with constraint name if available
        response_content = {
            "detail": "This record already exists in the database.",
            "error_type": "unique_violation"
        }
        
        if constraint_name:
            response_content["constraint"] = constraint_name
            
        return JSONResponse(
            status_code=status_code,
            content=response_content
        )
    
    # Handle foreign key violations
    if "ForeignKeyViolation" in error_message:
        status_code = 400  # Bad Request
        return JSONResponse(
            status_code=status_code,
            content={"detail": "Referenced record does not exist."}
        )
    
    # Handle check constraint violations
    if "CheckViolation" in error_message:
        status_code = 400  # Bad Request
        return JSONResponse(
            status_code=status_code,
            content={"detail": "Data validation failed."}
        )
    
    # Default error response
    return JSONResponse(
        status_code=status_code,
        content={"detail": "An error occurred while processing your request."}
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

# Specialized endpoints

# Get prefixes in a hierarchical structure
@api_router.get("/prefixes/hierarchy", tags=["Prefixes"])
def get_prefix_hierarchy(
    vrf_id: Optional[int] = None,
    session: Session = Depends(get_session)
):
    """
    Get prefixes in a hierarchical structure.
    
    Args:
        vrf_id: Optional VRF ID to filter by
        
    Returns:
        List of prefixes with hierarchical information
    """
    try:
        # Use the specialized CRUD method to get the hierarchy
        prefixes = crud.prefix.get_hierarchy(session, vrf_id)
        return model_to_dict({"items": prefixes})
    except Exception as e:
        logger.error(f"Error getting prefix hierarchy: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Error getting prefix hierarchy: {str(e)}")

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
create_crud_routes(api_router, "vlan_groups", crud.vlan_group, VLANGroup)
create_crud_routes(api_router, "asns", crud.asn, ASN)
create_crud_routes(api_router, "asn_ranges", crud.asn_range, ASNRange)
create_crud_routes(api_router, "route_targets", crud.route_target, RouteTarget)
create_crud_routes(api_router, "vrf_import_targets", crud.vrf_import_targets, VRFImportTargets)
create_crud_routes(api_router, "vrf_export_targets", crud.vrf_export_targets, VRFExportTargets)

# Get available IP addresses in a prefix
@api_router.get("/prefixes/{prefix_id}/available-ips")
def get_available_ips(
    prefix_id: int,
    limit: int = Query(100, ge=1, le=1000),
    session: Session = Depends(get_session)
):
    pass

# Get prefix utilization
@api_router.get("/prefixes/{prefix_id}/utilization")
def get_prefix_utilization(
    prefix_id: int,
    session: Session = Depends(get_session)
):
    """
    Get utilization data for a prefix.
    
    Args:
        prefix_id: Prefix ID
        
    Returns:
        Utilization data including percentage, used IPs, and total IPs
    """
    try:
        # Get the prefix
        prefix = session.get(Prefix, prefix_id)
        if not prefix:
            raise HTTPException(status_code=404, detail=f"Prefix with ID {prefix_id} not found")
        
        # Get IP addresses in this prefix
        query = select(IPAddress).where(IPAddress.prefix_id == prefix_id)
        ip_addresses = session.exec(query).all()
        
        # Get child prefixes
        query = select(Prefix).where(Prefix.parent_id == prefix_id)
        child_prefixes = session.exec(query).all()
        
        # Calculate utilization
        from .models.ip_utils import calculate_prefix_utilization
        
        # Extract prefix strings from child prefixes
        child_prefix_strings = [p.prefix for p in child_prefixes]
        
        # Extract IP address strings
        ip_address_strings = [ip.address for ip in ip_addresses]
        
        # Calculate utilization percentage
        percentage = calculate_prefix_utilization(
            prefix.prefix, 
            child_prefixes=child_prefix_strings,
            used_ips=ip_address_strings
        )
        
        # Calculate total IPs
        network = ipaddress.ip_network(prefix.prefix)
        total_ips = network.num_addresses
        
        # Calculate used IPs based on percentage
        used_ips = int(total_ips * (percentage / 100))
        
        return {
            "percentage": percentage,
            "used": used_ips,
            "total": total_ips
        }
    except Exception as e:
        logger.error(f"Error calculating prefix utilization: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Error calculating prefix utilization: {str(e)}")

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
                "role_id": ("roles", crud.role, "name"),
                "group_id": ("vlan_groups", crud.vlan_group, "name")
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
