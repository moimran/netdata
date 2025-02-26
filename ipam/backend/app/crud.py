"""
CRUD operations for all models in the IPAM system.
This module provides generic and specific CRUD operations for database models.
"""

from sqlmodel import Session, select
from typing import List, Type, TypeVar, Generic, Optional, Dict, Any, Union
from fastapi import HTTPException
from .models import (
    Region, SiteGroup, Site, Location, VRF, RIR, Aggregate, Role, 
    Prefix, IPRange, IPAddress, Tenant, Device, Interface, VLAN,
    ASN, ASNRange
)
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

    def get_all(self, session: Session, skip: int = 0, limit: int = 100, **kwargs) -> List[T]:
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
        Create a new record.
        """
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
                        # If any error occurs during type checking, keep the original value
                        cleaned_obj[key] = value
                else:
                    cleaned_obj[key] = value
            else:
                cleaned_obj[key] = value
                
        db_obj = self.model(**cleaned_obj)
        session.add(db_obj)
        session.commit()
        session.refresh(db_obj)
        return db_obj

    def update(self, session: Session, id: int, obj_in: Dict[str, Any]) -> Optional[T]:
        """
        Update a record by its ID.
        """
        db_obj = self.get_by_id(session, id)
        if not db_obj:
            return None
        
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
                        # If any error occurs during type checking, keep the original value
                        cleaned_obj[key] = value
                else:
                    cleaned_obj[key] = value
            else:
                cleaned_obj[key] = value
                
        for key, value in cleaned_obj.items():
            if hasattr(db_obj, key):
                setattr(db_obj, key, value)
        
        session.add(db_obj)
        session.commit()
        session.refresh(db_obj)
        return db_obj

    def delete(self, session: Session, id: int) -> bool:
        """
        Delete a record by its ID.
        """
        db_obj = self.get_by_id(session, id)
        if not db_obj:
            return False
        
        session.delete(db_obj)
        session.commit()
        return True

    def search(self, session: Session, query: str, skip: int = 0, limit: int = 100) -> List[T]:
        """
        Search for records matching the query string.
        This is a basic implementation that should be overridden by specific models.
        """
        # Default implementation just returns all records
        return self.get_all(session, skip, limit)


# Create CRUD instances for each model
region = CRUDBase(Region)
site_group = CRUDBase(SiteGroup)
site = CRUDBase(Site)
location = CRUDBase(Location)
vrf = CRUDBase(VRF)
rir = CRUDBase(RIR)
aggregate = CRUDBase(Aggregate)
role = CRUDBase(Role)
prefix = CRUDBase(Prefix)
ip_range = CRUDBase(IPRange)
ip_address = CRUDBase(IPAddress)
tenant = CRUDBase(Tenant)
device = CRUDBase(Device)
interface = CRUDBase(Interface)
vlan = CRUDBase(VLAN)
asn = CRUDBase(ASN)
asn_range = CRUDBase(ASNRange)

# Add specialized CRUD operations for specific models if needed
# For example:

# class PrefixCRUD(CRUDBase[Prefix]):
#     """
#     CRUD operations specific to Prefix model.
#     """
#     def get_available_ips(self, session: Session, prefix_id: int) -> List[str]:
#         """
#         Get available IP addresses in a prefix.
#         """
#         # Implementation here
#         pass

# prefix = PrefixCRUD(Prefix)
