from typing import Dict, Any, Union, TypeVar, Generic, Type, Optional
from fastapi import HTTPException
from sqlmodel import Session, select
from sqlalchemy.exc import IntegrityError
import logging

# Configure logging
logger = logging.getLogger(__name__)

# Generic type for SQLModel models
T = TypeVar('T')

class CRUDBase(Generic[T]):
    """
    Base class for CRUD operations on a SQLModel model.
    """
    def __init__(self, model: Type[T]):
        self.model = model

    def get_all(self, session: Session, skip: int = 0, limit: int = 100, **kwargs) -> list[T]:
        """
        Get all records of the model, with optional pagination and filtering.
        """
        try:
            logger.debug(f"CRUD get_all for {self.model.__name__}: skip={skip}, limit={limit}, kwargs={kwargs}")
            
            query = select(self.model)
            
            # Apply filters from kwargs
            for key, value in kwargs.items():
                if hasattr(self.model, key) and value is not None:
                    logger.debug(f"Applying filter: {key}={value}")
                    query = query.where(getattr(self.model, key) == value)
                else:
                    if not hasattr(self.model, key):
                        logger.warning(f"Model {self.model.__name__} does not have attribute {key}")
            
            logger.debug(f"Executing query: {query}")
            result = session.exec(query.offset(skip).limit(limit)).all()
            logger.debug(f"Query returned {len(result)} results")
            return result
        except Exception as e:
            logger.error(f"Error in CRUD get_all for {self.model.__name__}: {str(e)}", exc_info=True)
            raise

    def get_by_id(self, session: Session, id: int) -> Optional[T]:
        """
        Get a record by its ID.
        """
        return session.get(self.model, id)

    def create(self, session: Session, obj_in: Dict[str, Any]) -> T:
        """
        Create a new record with duplicate checking.
        """
        try:
            # Check for unique constraints based on model attributes
            unique_fields = getattr(self.model, '__unique_fields__', [])
            if unique_fields:
                query = select(self.model)
                for field in unique_fields:
                    if field in obj_in:
                        query = query.where(getattr(self.model, field) == obj_in[field])
                
                existing_record = session.exec(query).first()
                if (existing_record):
                    raise HTTPException(
                        status_code=409,
                        detail=f"{self.model.__name__} with {', '.join(f'{field}={obj_in[field]}' for field in unique_fields if field in obj_in)} already exists"
                    )

            # Convert empty strings to None for integer and float fields
            cleaned_obj = {}
            for key, value in obj_in.items():
                if value == "" and hasattr(self.model, key):
                    # Check if the field is an integer or float by looking at the model's __annotations__
                    field_type = self.model.__annotations__.get(key, None)
                    # Simple check for int and float types
                    if field_type in (int, float):
                        cleaned_obj[key] = None
                    # Check for Optional[int] and Optional[float]
                    elif field_type is not None and hasattr(field_type, "__origin__"):
                        try:
                            if field_type.__origin__ is Union and any(arg in (int, float) for arg in field_type.__args__):
                                cleaned_obj[key] = None
                            else:
                                cleaned_obj[key] = value
                        except (AttributeError, TypeError):
                            # Handle cases where __args__ might not be present or field_type isn't subscriptable
                            cleaned_obj[key] = value 
                    else:
                         cleaned_obj[key] = value # Keep original value if not int/float or empty string
                else:
                     cleaned_obj[key] = value # Keep original value if not empty string
            
            # Ensure obj_in is updated with cleaned values before creating the model instance
            obj_in.update(cleaned_obj)
            
            db_obj = self.model(**obj_in)  # Use updated obj_in
            session.add(db_obj)
            session.commit()
            session.refresh(db_obj)
            return db_obj
        except IntegrityError as e:
            session.rollback()
            logger.error(f"Integrity error creating {self.model.__name__}: {e}")
            raise HTTPException(status_code=400, detail=f"Data integrity error: {e.orig}")
        except Exception as e:
            session.rollback()
            logger.error(f"Error creating {self.model.__name__}: {e}", exc_info=True)
            raise HTTPException(status_code=500, detail="Internal server error during creation.")

    # Placeholder for update method - specific implementations will likely override
    def update(self, session: Session, db_obj: T, obj_in: Union[Dict[str, Any], Any]) -> T:
        raise NotImplementedError("Update method must be implemented in subclass")

    def remove(self, session: Session, *, id: int) -> T:
        """
        Delete a record by its ID.
        """
        try:
            obj = session.get(self.model, id)
            if not obj:
                logger.warning(f"Attempted to delete non-existent {self.model.__name__} with id {id}")
                # Decide whether to raise 404 or return None/False
                # Returning None might be sufficient if the caller checks
                return None # Or raise HTTPException(status_code=404, detail="Not found")
            
            session.delete(obj)
            session.commit()
            logger.info(f"Successfully deleted {self.model.__name__} with id {id}")
            return obj # Return the deleted object
        except Exception as e:
            session.rollback()
            logger.error(f"Error deleting {self.model.__name__} with id {id}: {e}", exc_info=True)
            raise HTTPException(status_code=500, detail="Internal server error during deletion.")
