from fastapi import APIRouter, HTTPException, Depends, Query, Request
from sqlmodel import Session, select
from typing import Optional, List, TypeVar, Generic
from pydantic import BaseModel, ValidationError
from uuid import UUID
from ..database import get_session
# Import CRUDBase only when needed for type checking
import logging

# Configure logging
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

# Generic Pydantic model for paginated responses
T = TypeVar('T')

class PaginatedResponse(BaseModel, Generic[T]):
    items: List[T]
    total: int
    page: int
    size: int

# Generic CRUD endpoints for each model
def create_crud_routes(router: APIRouter, path: str, crud_module, crud_instance, model_type, CreateSchema: type[BaseModel], UpdateSchema: type[BaseModel], ReadSchema: type[BaseModel], tags: Optional[List[str]] = None):
    # Define the specific response model for this route
    PaginatedReadSchema = PaginatedResponse[ReadSchema]

    @router.get(f"/{path}", tags=tags, response_model=PaginatedReadSchema)
    def get_all(
        skip: int = Query(0, ge=0),
        limit: int = Query(20, ge=1, le=100),
        search: Optional[str] = None,
        session: Session = Depends(get_session),
        request: Request = None,
    ) -> PaginatedReadSchema:
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
            
            # Special handling for Prefix objects - convert IPv4Network/IPv6Network to strings
            if path == "prefixes":
                for item in items:
                    if hasattr(item, 'prefix') and hasattr(item.prefix, 'compressed'):
                        # Convert IPv4Network/IPv6Network to string
                        item.prefix = str(item.prefix)
            
            # Special handling for IP Range objects - convert IPv4Network/IPv6Network to strings
            if path == "ip_ranges":
                for item in items:
                    if hasattr(item, 'start_address') and hasattr(item.start_address, 'compressed'):
                        # Convert IPv4Network/IPv6Network to string
                        item.start_address = str(item.start_address)
                    if hasattr(item, 'end_address') and hasattr(item.end_address, 'compressed'):
                        # Convert IPv4Network/IPv6Network to string
                        item.end_address = str(item.end_address)
                        
            # Special handling for IP Address objects - convert IPv4Network/IPv6Network to strings
            if path == "ip_addresses":
                for item in items:
                    if hasattr(item, 'address') and hasattr(item.address, 'compressed'):
                        # Convert IPv4Network/IPv6Network to string
                        item.address = str(item.address)
            
            # Count total items (without pagination)
            query = select(model_type)
            for key, value in filter_params.items():
                if hasattr(model_type, key):
                    query = query.where(getattr(model_type, key) == value)
                else:
                    logger.warning(f"GET /{path} - Model {model_type.__name__} does not have attribute {key}")
            total = len(session.exec(query).all())
            
            logger.debug(f"GET /{path} - Found {len(items)} items, total: {total}")
            
            # Return a PaginatedResponse object with the raw items
            return PaginatedResponse(
                items=items,
                total=total,
                page=skip // limit + 1,
                size=limit
            )
        except Exception as e:
            logger.error(f"Error in GET /{path}: {str(e)}", exc_info=True)
            raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

    @router.get(f"/{path}/{{item_id}}", tags=tags, response_model=ReadSchema)
    def get_one(item_id: UUID, session: Session = Depends(get_session)):
        item = crud_instance.get_by_id(session, item_id)
        if not item:
            raise HTTPException(status_code=404, detail=f"{path} not found")
        
        # Special handling for Prefix objects - convert IPv4Network/IPv6Network to strings
        if path == "prefixes" and hasattr(item, 'prefix') and hasattr(item.prefix, 'compressed'):
            # Convert IPv4Network/IPv6Network to string
            item.prefix = str(item.prefix)
            
        # Special handling for IP Range objects - convert IPv4Network/IPv6Network to strings
        if path == "ip_ranges":
            if hasattr(item, 'start_address') and hasattr(item.start_address, 'compressed'):
                # Convert IPv4Network/IPv6Network to string
                item.start_address = str(item.start_address)
            if hasattr(item, 'end_address') and hasattr(item.end_address, 'compressed'):
                # Convert IPv4Network/IPv6Network to string
                item.end_address = str(item.end_address)
                
        # Special handling for IP Address objects - convert IPv4Network/IPv6Network to strings
        if path == "ip_addresses":
            if hasattr(item, 'address') and hasattr(item.address, 'compressed'):
                # Convert IPv4Network/IPv6Network to string
                item.address = str(item.address)
            
        return item

    @router.post(f"/{path}", status_code=201, tags=tags, response_model=ReadSchema)
    def create_item(item: CreateSchema, session: Session = Depends(get_session)):
        # Convert empty strings to None for fields that should be integers or floats
        item_dict = item.model_dump() if hasattr(item, 'model_dump') else item.dict()
        for key, value in item_dict.items():
            if value == "":
                # Check if the field is an integer or float by looking at the model's __annotations__
                field_type = getattr(model_type, "__annotations__", {}).get(key, None)
                # Simple check for int and float types
                if field_type in (int, float):
                    item_dict[key] = None
                # Check for Optional[int] and Optional[float]
                elif field_type is not None and hasattr(field_type, "__origin__"):
                    try:
                        from typing import Union
                        if field_type.__origin__ is Union and any(arg in (int, float) for arg in field_type.__args__):
                            item_dict[key] = None
                    except (AttributeError, TypeError):
                        # If any error occurs during type checking, keep the original value
                        pass
        
        created_item = crud_instance.create(session, obj_in=item_dict)
        
        # Special handling for Prefix objects - convert IPv4Network/IPv6Network to strings
        if path == "prefixes" and hasattr(created_item, 'prefix') and hasattr(created_item.prefix, 'compressed'):
            # Convert IPv4Network/IPv6Network to string
            created_item.prefix = str(created_item.prefix)
            
        # Special handling for IP Range objects - convert IPv4Network/IPv6Network to strings
        if path == "ip_ranges":
            if hasattr(created_item, 'start_address') and hasattr(created_item.start_address, 'compressed'):
                # Convert IPv4Network/IPv6Network to string
                created_item.start_address = str(created_item.start_address)
            if hasattr(created_item, 'end_address') and hasattr(created_item.end_address, 'compressed'):
                # Convert IPv4Network/IPv6Network to string
                created_item.end_address = str(created_item.end_address)
                
        # Special handling for IP Address objects - convert IPv4Network/IPv6Network to strings
        if path == "ip_addresses":
            if hasattr(created_item, 'address') and hasattr(created_item.address, 'compressed'):
                # Convert IPv4Network/IPv6Network to string
                created_item.address = str(created_item.address)
                
        return created_item

    @router.put(f"/{path}/{{item_id}}", response_model=ReadSchema, tags=tags)
    def update_item(
        item_id: int,
        item: UpdateSchema, 
        session: Session = Depends(get_session),
        current_crud_module = crud_module,
        current_UpdateSchema = UpdateSchema,
        current_path = path
    ):
        logger.debug(f"PUT /{current_path}/{{item_id}} - ID: {item_id}")
        logger.debug(f"PUT /{current_path}/{{item_id}} - Received data: {item}")

        # Fetch the existing item to ensure it exists before update attempt
        db_obj = session.get(model_type, item_id)
        if not db_obj:
             logger.warning(f"PUT /{current_path}/{{item_id}} - Item with ID {item_id} not found.")
             raise HTTPException(status_code=404, detail=f"{current_path.capitalize().rstrip('s')} with id {item_id} not found")

        # Get the raw data from the input schema
        item_data = item.model_dump(exclude_unset=True)
        logger.debug(f"PUT /{current_path}/{{item_id}} - Parsed update data: {item_data}")

        # Validate the incoming data using the correct UpdateSchema for this route
        try:
            validated_data = current_UpdateSchema(**item_data)
            logger.debug(f"PUT /{current_path}/{{item_id}} - Validated data: {validated_data}")
        except ValidationError as e:
            logger.error(f"PUT /{current_path}/{{item_id}} - Validation Error: {e.errors()}")
            raise HTTPException(status_code=422, detail=e.errors())

        # Get the specific update function from the correct crud_module for this route
        resource_name = current_path
        
        # More robust way to get singular form of resource name
        singular_forms = {
            'prefixes': 'prefix',
            'addresses': 'address',
            'ip_addresses': 'ip_address',  # Special case for ip_addresses
            'categories': 'category',
            'entities': 'entity',
            'families': 'family',
            'properties': 'property',
            'statuses': 'status',
            'indices': 'index',
            'matrices': 'matrix',
            'vertices': 'vertex',
            # Add more irregular plurals as needed
        }
        
        # Get singular form from the mapping or use standard approach
        if resource_name in singular_forms:
            singular = singular_forms[resource_name]
        else:
            # Handle regular plurals ending with 's'
            singular = resource_name[:-1] if resource_name.endswith('s') else resource_name
        
        update_func_name = f"update_{singular}"
        if not hasattr(current_crud_module, update_func_name):
            logger.error(f"Specific CRUD function '{update_func_name}' not found in provided crud_module '{getattr(current_crud_module, '__name__', 'N/A')}' for path '{current_path}'.")
            raise HTTPException(status_code=500, detail=f"Internal configuration error: Update function not found for {current_path}.")
        update_func = getattr(current_crud_module, update_func_name)

        # Call the fetched update function with appropriate arguments
        try:
            if resource_name == "vrfs":
                 logger.debug(f"Calling {update_func_name} with db, vrf_id={item_id}, vrf_in=validated_data")
                 updated_item = update_func(db=session, vrf_id=item_id, vrf_in=validated_data)
            elif resource_name == "route_targets": 
                 logger.debug(f"Calling {update_func_name} with db, rt_id={item_id}, rt_in=validated_data")
                 updated_item = update_func(db=session, rt_id=item_id, rt_in=validated_data)
            else:
                 logger.warning(f"Unhandled resource type '{resource_name}' in generic update router. Attempting generic call with id={item_id}, obj_in=validated_data.")
                 try:
                     updated_item = update_func(db=session, id=item_id, obj_in=validated_data)
                 except AttributeError:
                     logger.error(f"Update function '{update_func_name}' does not match expected generic signature for resource '{resource_name}'.")
                     raise HTTPException(status_code=500, detail="Internal server error: Update function signature mismatch.")

        except TypeError as e:
            logger.error(f"TypeError calling {update_func_name} for {resource_name} ID {item_id}: {e}")
            raise HTTPException(status_code=500, detail="Internal server error: Argument mismatch calling update function.")
        except Exception as e:
             logger.error(f"Unexpected error calling {update_func_name} for {resource_name} ID {item_id}: {e}", exc_info=True)
             raise HTTPException(status_code=500, detail=f"Internal server error during update of {resource_name}.")

        if updated_item is None:
            logger.warning(f"Update operation returned None for {resource_name} ID {item_id}.")
            raise HTTPException(status_code=404, detail=f"{resource_name.capitalize().rstrip('s')} with id {item_id} not found during update.")

        logger.debug(f"PUT /{current_path}/{{item_id}} - Update successful for ID: {item_id}")
        
        # Special handling for Prefix objects - convert IPv4Network/IPv6Network to strings
        if current_path == "prefixes" and hasattr(updated_item, 'prefix') and hasattr(updated_item.prefix, 'compressed'):
            # Convert IPv4Network/IPv6Network to string
            updated_item.prefix = str(updated_item.prefix)
            
        # Special handling for IP Range objects - convert IPv4Network/IPv6Network to strings
        if current_path == "ip_ranges":
            if hasattr(updated_item, 'start_address') and hasattr(updated_item.start_address, 'compressed'):
                # Convert IPv4Network/IPv6Network to string
                updated_item.start_address = str(updated_item.start_address)
            if hasattr(updated_item, 'end_address') and hasattr(updated_item.end_address, 'compressed'):
                # Convert IPv4Network/IPv6Network to string
                updated_item.end_address = str(updated_item.end_address)
                
        # Special handling for IP Address objects - convert IPv4Network/IPv6Network to strings
        if current_path == "ip_addresses":
            if hasattr(updated_item, 'address') and hasattr(updated_item.address, 'compressed'):
                # Convert IPv4Network/IPv6Network to string
                updated_item.address = str(updated_item.address)
                
        return ReadSchema.from_orm(updated_item)

    @router.delete(f"/{path}/{{item_id}}", status_code=204, tags=tags, response_model=None)
    def delete_item(
        item_id: UUID,
        session: Session = Depends(get_session),
        current_crud_instance = crud_instance,
        current_path: str = path
    ):
        logger.debug(f"DELETE /{current_path}/{{item_id}} - ID: {item_id}")
        try:
            current_crud_instance.remove(db=session, id=item_id)
            logger.debug(f"DELETE /{current_path}/{{item_id}} - Deletion successful for ID: {item_id}")
        except Exception as e:
            logger.error(f"Error deleting {current_path} ID {item_id}: {e}", exc_info=True)
            raise HTTPException(status_code=500, detail=f"Error deleting {current_path.capitalize().rstrip('s')}.")

        return None

    return router
