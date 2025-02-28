"""
CRUD operations for all models in the IPAM system.
This module provides generic and specific CRUD operations for database models.
"""

from typing import Dict, Any, List, Optional, Type, TypeVar, Union, Generic
from datetime import datetime
import ipaddress
from fastapi import HTTPException
import sqlalchemy
from sqlalchemy.exc import IntegrityError
from sqlmodel import Session, select
from sqlalchemy.sql import func
from .models import (
    Region, SiteGroup, Site, Location, VRF, RIR, Aggregate, Role, 
    Prefix, IPRange, IPAddress, Tenant, Device, Interface, VLAN, VLANGroup,
    ASN, ASNRange, RouteTarget, VRFImportTargets, VRFExportTargets
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
        except HTTPException:
            raise
        except Exception as e:
            # Rollback the session in case of error
            session.rollback()
            
            # Log the error
            logger.error(f"Error creating {self.model.__name__}: {str(e)}", exc_info=True)
            
            # Re-raise the exception to be handled by the global exception handler
            raise

    def update(self, session: Session, id: int, obj_in: Dict[str, Any]) -> Optional[T]:
        """
        Update a record by its ID.
        """
        try:
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
        except Exception as e:
            # Rollback the session in case of error
            session.rollback()
            
            # Log the error
            logger.error(f"Error updating {self.model.__name__}: {str(e)}", exc_info=True)
            
            # Re-raise the exception to be handled by the global exception handler
            raise

    def delete(self, session: Session, id: int) -> bool:
        """
        Delete a record by its ID.
        """
        try:
            db_obj = self.get_by_id(session, id)
            if not db_obj:
                return False
            
            session.delete(db_obj)
            session.commit()
            return True
        except Exception as e:
            # Rollback the session in case of error
            session.rollback()
            
            # Log the error
            logger.error(f"Error deleting {self.model.__name__}: {str(e)}", exc_info=True)
            
            # Re-raise the exception to be handled by the global exception handler
            raise

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
vlan_group = CRUDBase(VLANGroup)
asn = CRUDBase(ASN)
asn_range = CRUDBase(ASNRange)
route_target = CRUDBase(RouteTarget)
vrf_import_targets = CRUDBase(VRFImportTargets)
vrf_export_targets = CRUDBase(VRFExportTargets)

# Add specialized CRUD operations for specific models if needed

class PrefixCRUD(CRUDBase[Prefix]):
    """
    CRUD operations specific to Prefix model.
    """
    def create(self, session: Session, obj_in: Dict[str, Any]) -> Prefix:
        """
        Create a new prefix and update hierarchical relationships.
        """
        try:
            # Create the prefix using the base method
            db_obj = super().create(session, obj_in)
            
            # Update hierarchical relationships
            db_obj.update_hierarchy(session)
            
            # Commit changes
            session.commit()
            session.refresh(db_obj)
            
            return db_obj
        except IntegrityError as e:
            # Rollback the session in case of error
            session.rollback()
            
            # Check for unique constraint violation
            if "UniqueViolation" in str(e) or "duplicate key" in str(e):
                if "uq_prefix_vrf" in str(e):
                    # Extract prefix and VRF information if possible
                    prefix_value = obj_in.get('prefix', 'unknown')
                    vrf_id = obj_in.get('vrf_id', None)
                    
                    # Get VRF name if possible
                    vrf_name = "Unknown VRF"
                    if vrf_id:
                        try:
                            vrf = session.get(VRF, vrf_id)
                            if vrf:
                                vrf_name = vrf.name
                        except Exception:
                            pass
                    
                    # Raise a more specific error
                    raise HTTPException(
                        status_code=409,
                        detail={
                            "detail": f"The prefix {prefix_value} already exists in {vrf_name}. Please use a different prefix or VRF.",
                            "error_type": "unique_violation",
                            "constraint": "uq_prefix_vrf",
                            "prefix": prefix_value,
                            "vrf_id": vrf_id,
                            "vrf_name": vrf_name
                        }
                    )
            
            # Log the error
            logger.error(f"Error creating prefix: {str(e)}", exc_info=True)
            
            # Re-raise the exception to be handled by the global exception handler
            raise
        except Exception as e:
            # Rollback the session in case of error
            session.rollback()
            
            # Log the error
            logger.error(f"Error creating prefix: {str(e)}", exc_info=True)
            
            # Re-raise the exception to be handled by the global exception handler
            raise
    
    def update(self, session: Session, id: int, obj_in: Dict[str, Any]) -> Optional[Prefix]:
        """
        Update a prefix and update hierarchical relationships if needed.
        """
        try:
            # Get the existing prefix
            db_obj = self.get_by_id(session, id)
            if not db_obj:
                return None
            
            # Check if the prefix value is changing
            prefix_changing = 'prefix' in obj_in and obj_in['prefix'] != db_obj.prefix
            vrf_changing = 'vrf_id' in obj_in and obj_in['vrf_id'] != db_obj.vrf_id
            
            # Update the prefix using the base method
            db_obj = super().update(session, id, obj_in)
            
            # If the prefix or VRF changed, update hierarchical relationships
            if prefix_changing or vrf_changing:
                db_obj.update_hierarchy(session)
            
            # Commit changes
            session.commit()
            session.refresh(db_obj)
            
            return db_obj
        except Exception as e:
            # Rollback the session in case of error
            session.rollback()
            
            # Log the error
            logger.error(f"Error updating prefix: {str(e)}", exc_info=True)
            
            # Re-raise the exception to be handled by the global exception handler
            raise
    
    def delete(self, session: Session, id: int) -> bool:
        """
        Delete a prefix and update hierarchical relationships.
        """
        try:
            # Get the prefix to delete
            db_obj = self.get_by_id(session, id)
            if not db_obj:
                return False
            
            # Update parent's child count if this prefix has a parent
            if db_obj.parent_id:
                parent = session.get(Prefix, db_obj.parent_id)
                if parent:
                    parent.child_count = max(0, parent.child_count - 1)
                    session.add(parent)
            
            # Delete the prefix using the base method
            result = super().delete(session, id)
            
            # Commit changes
            session.commit()
            
            return result
        except Exception as e:
            # Rollback the session in case of error
            session.rollback()
            
            # Log the error
            logger.error(f"Error deleting prefix: {str(e)}", exc_info=True)
            
            # Re-raise the exception to be handled by the global exception handler
            raise
    
    def get_hierarchy(self, session: Session, vrf_id: Optional[int] = None) -> List[Dict[str, Any]]:
        """
        Get prefixes in a hierarchical structure.
        
        Args:
            session: Database session
            vrf_id: Optional VRF ID to filter by
            
        Returns:
            List of prefixes with hierarchical information
        """
        # Query for all prefixes, optionally filtered by VRF
        query = select(Prefix)
        if vrf_id is not None:
            query = query.where(Prefix.vrf_id == vrf_id)
        
        # Order by prefix to ensure consistent results
        query = query.order_by(Prefix.prefix)
        
        prefixes = session.exec(query).all()
        
        # Convert to dictionaries with additional hierarchical information
        result = []
        for prefix in prefixes:
            prefix_dict = {
                "id": prefix.id,
                "prefix": prefix.prefix,
                "status": prefix.status,
                "vrf_id": prefix.vrf_id,
                "site_id": prefix.site_id,
                "tenant_id": prefix.tenant_id,
                "depth": prefix.depth,
                "parent_id": prefix.parent_id,
                "child_count": prefix.child_count
            }
            result.append(prefix_dict)
        
        return result

# Replace the default prefix CRUD with our specialized version
prefix = PrefixCRUD(Prefix)
