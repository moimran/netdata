from fastapi import APIRouter, HTTPException, Depends, Query, Request
from sqlmodel import Session, select
from typing import Dict, Any, Optional
from ..database import get_session
import logging

# Configure logging
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

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
            from ..serializers import model_to_dict
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
        from ..serializers import model_to_dict
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
                        from typing import Union
                        if field_type.__origin__ is Union and any(arg in (int, float) for arg in field_type.__args__):
                            item[key] = None
                    except (AttributeError, TypeError):
                        # If any error occurs during type checking, keep the original value
                        pass
        
        created_item = crud_instance.create(session, item)
        # Convert created item to dictionary with proper serialization
        from ..serializers import model_to_dict
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
                        from typing import Union
                        if field_type.__origin__ is Union and any(arg in (int, float) for arg in field_type.__args__):
                            item[key] = None
                    except (AttributeError, TypeError):
                        # If any error occurs during type checking, keep the original value
                        pass
        
        updated_item = crud_instance.update(session, item_id, item)
        if not updated_item:
            raise HTTPException(status_code=404, detail=f"Item with id {item_id} not found")
        
        # Convert updated item to dictionary with proper serialization
        from ..serializers import model_to_dict
        serialized_item = model_to_dict(updated_item)
        return serialized_item

    @router.delete(f"/{path}/{{item_id}}", status_code=204)
    def delete_item(item_id: int, session: Session = Depends(get_session)):
        success = crud_instance.delete(session, item_id)
        if not success:
            raise HTTPException(status_code=404, detail=f"Item with id {item_id} not found")
        return None
