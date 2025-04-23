"""
CRUD operations for all models in the IPAM system.
This module provides generic and specific CRUD operations for database models.
"""

from typing import Dict, Any, Union, TypeVar, Generic, Type, Optional
from fastapi import HTTPException
from sqlalchemy.exc import IntegrityError
from sqlmodel import Session, select
from .utils import slugify
from .models import (
    Region, SiteGroup, Site, Location, VRF, RIR, Aggregate, Role, 
    Prefix, IPRange, IPAddress, Tenant, Device, Interface, VLAN, VLANGroup,
    ASN, ASNRange, RouteTarget, VRFImportTargets, VRFExportTargets, Credential,
    PlatformType, NetJob, DeviceInventory
)
import logging
from uuid import UUID

# Configure logging
logger = logging.getLogger(__name__)

# Generic type for SQLModel models
T = TypeVar('T')

# Create CRUD instances for each model
class RegionCRUD:
    """
    CRUD operations for Regions.
    """
    def get_all(self, session: Session, skip: int = 0, limit: int = 100, **kwargs) -> list[Region]:
        """
        Get all regions with optional pagination and filtering.
        """
        try:
            logger.debug(f"RegionCRUD get_all: skip={skip}, limit={limit}, kwargs={kwargs}")
            
            query = select(Region)
            
            # Apply filters from kwargs
            for key, value in kwargs.items():
                if hasattr(Region, key) and value is not None:
                    logger.debug(f"Applying filter: {key}={value}")
                    query = query.where(getattr(Region, key) == value)
                else:
                    if not hasattr(Region, key):
                        logger.warning(f"Model Region does not have attribute {key}")
            
            logger.debug(f"Executing query: {query}")
            result = session.exec(query.offset(skip).limit(limit)).all()
            logger.debug(f"Query returned {len(result)} results")
            return result
        except Exception as e:
            logger.error(f"Error in RegionCRUD get_all: {str(e)}", exc_info=True)
            raise
    
    def get_by_id(self, session: Session, id: int) -> Optional[Region]:
        """
        Get a region by its ID.
        """
        return session.get(Region, id)
    
    def create(self, session: Session, obj_in: Dict[str, Any]) -> Region:
        """
        Create a new Region with validation for unique name.
        """
        try:
            # Create the Region using the base method
            name_value = obj_in.get('name')
            
            db_obj = Region(**obj_in)
            session.add(db_obj)
            session.commit()
            session.refresh(db_obj)
            return db_obj
        except IntegrityError as e:
            # Rollback the session in case of error
            session.rollback()
            
            # Check if it's a unique constraint violation for name
            error_message = str(e)
            if "uq_region_name" in error_message:
                raise HTTPException(
                    status_code=409,
                    detail={
                        "detail": f"Region with name '{name_value}' already exists. Please use a different name.",
                        "error_type": "unique_violation",
                        "constraint": "uq_region_name",
                        "name": name_value
                    }
                )
            
            # Re-raise the exception for other errors
            raise
    
    def update_region(self, db: Session, id: int, obj_in) -> Optional[Region]:
        """
        Update a region by ID.
        """
        db_obj = db.get(Region, id)
        if not db_obj:
            return None
            
        # Convert Pydantic model to dict if it's not already a dict
        update_data = obj_in
        if not isinstance(obj_in, dict):
            update_data = obj_in.dict(exclude_unset=True)
            
        # Auto-generate slug if name is updated and slug is not provided
        if 'name' in update_data and update_data['name'] and ('slug' not in update_data or not update_data['slug']):
            update_data['slug'] = slugify(update_data['name'])
            logger.debug(f"Auto-generated slug '{update_data['slug']}' from updated name '{update_data['name']}'")
            
        # Update object attributes
        for key, value in update_data.items():
            if hasattr(db_obj, key):
                setattr(db_obj, key, value)
                
        db.add(db_obj)
        db.commit()
        db.refresh(db_obj)
        return db_obj
    
    def remove(self, db: Session, *, id: int) -> Optional[Region]:
        """
        Delete a region by ID.
        """
        obj = db.get(Region, id)
        if not obj:
            return None
            
        db.delete(obj)
        db.commit()
        return obj

class PrefixCRUD:
    """
    CRUD operations specific to Prefix model.
    """
    def create(self, session: Session, obj_in: Dict[str, Any]) -> Prefix:
        """
        Create a new prefix and update hierarchical relationships.
        """
        try:
            # Create the prefix using the base method
            db_obj = Prefix(**obj_in)
            session.add(db_obj)
            session.commit()
            session.refresh(db_obj)
            
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
            db_obj = session.get(Prefix, id)
            if not db_obj:
                return None
            
            # Check if the prefix value is changing
            prefix_changing = 'prefix' in obj_in and obj_in['prefix'] != db_obj.prefix
            vrf_changing = 'vrf_id' in obj_in and obj_in['vrf_id'] != db_obj.vrf_id
            
            # Update the prefix using the base method
            for key, value in obj_in.items():
                if hasattr(db_obj, key):
                    setattr(db_obj, key, value)
            
            session.add(db_obj)
            session.commit()
            session.refresh(db_obj)
            
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
            db_obj = session.get(Prefix, id)
            if not db_obj:
                return False
            
            # Update parent's child count if this prefix has a parent
            if db_obj.parent_id:
                parent = session.get(Prefix, db_obj.parent_id)
                if parent:
                    parent.child_count = max(0, parent.child_count - 1)
                    session.add(parent)
            
            # Delete the prefix using the base method
            session.delete(db_obj)
            session.commit()
            return True
        except Exception as e:
            # Rollback the session in case of error
            session.rollback()
            
            # Log the error
            logger.error(f"Error deleting prefix: {str(e)}", exc_info=True)
            
            # Re-raise the exception to be handled by the global exception handler
            raise
    
    def get_hierarchy(self, session: Session, vrf_id: Optional[int] = None) -> list[Dict[str, Any]]:
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
            # Only include fields that exist in the database
            prefix_dict = {
                "id": prefix.id,
                "prefix": prefix.prefix,
                "status": prefix.status,
                "vrf_id": prefix.vrf_id,
                "site_id": prefix.site_id,
                "tenant_id": prefix.tenant_id,
                "depth": prefix.depth,
                "parent_id": prefix.parent_id,
                "child_count": prefix.child_count,
                "description": prefix.description,
                "is_pool": prefix.is_pool,
                "mark_utilized": prefix.mark_utilized,
                "vlan_id": prefix.vlan_id,
                "role_id": prefix.role_id
            }
            result.append(prefix_dict)
        
        return result

class IPAddressCRUD:
    """
    CRUD operations for IP addresses.
    """
    def create(self, session: Session, obj_in: Dict[str, Any]) -> IPAddress:
        """
        Create a new IP address with validation.
        """
        try:
            # Create the IP address using the base method
            address_value = obj_in.get('address')
            vrf_id = obj_in.get('vrf_id')
            vrf_name = "global"
            
            if vrf_id:
                # Try to get the VRF name for better error messages
                vrf = session.get(VRF, vrf_id)
                if vrf:
                    vrf_name = vrf.name
            
            db_obj = IPAddress(**obj_in)
            session.add(db_obj)
            session.commit()
            session.refresh(db_obj)
            return db_obj
        except IntegrityError as e:
            # Rollback the session in case of error
            session.rollback()
            
            # Check if it's a unique constraint violation for address+VRF
            error_message = str(e)
            if "uq_ipaddress_vrf" in error_message:
                raise HTTPException(
                    status_code=409,
                    detail={
                        "detail": f"The IP address {address_value} already exists in {vrf_name}. Please use a different IP address or VRF.",
                        "error_type": "unique_violation",
                        "constraint": "uq_ipaddress_vrf",
                        "address": address_value,
                        "vrf_id": vrf_id,
                        "vrf_name": vrf_name
                    }
                )
            
            # Re-raise the exception for other errors
            raise

class CredentialCRUD:
    """
    CRUD operations for Credentials.
    """
    def create(self, session: Session, obj_in: Dict[str, Any]) -> Credential:
        """
        Create a new credential with validation for unique name.
        """
        try:
            # Create the credential using the base method
            name_value = obj_in.get('name')
            
            db_obj = Credential(**obj_in)
            session.add(db_obj)
            session.commit()
            session.refresh(db_obj)
            return db_obj
        except IntegrityError as e:
            # Rollback the session in case of error
            session.rollback()
            
            # Check if it's a unique constraint violation for name
            error_message = str(e)
            if "uq_credential_name" in error_message:
                raise HTTPException(
                    status_code=409,
                    detail={
                        "detail": f"Credential with name '{name_value}' already exists. Please use a different name.",
                        "error_type": "unique_violation",
                        "constraint": "uq_credential_name",
                        "name": name_value
                    }
                )
            
            # Re-raise the exception for other errors
            raise

class PlatformTypeCRUD:
    """
    CRUD operations for PlatformTypes.
    """
    pass

class NetJobCRUD:
    """
    CRUD operations for NetJobs.
    """
    pass

class DeviceInventoryCRUD:
    """
    CRUD operations for DeviceInventory.
    """
    def get_by_device_uuid(self, session: Session, *, device_uuid: UUID) -> list[DeviceInventory]:
        """
        Get all inventory records for a specific device UUID.
        """
        statement = select(DeviceInventory).where(DeviceInventory.device_uuid == device_uuid).order_by(DeviceInventory.time.desc())
        return session.exec(statement).all()

    def remove_by_device_uuid(self, session: Session, *, device_uuid: UUID) -> int:
        """
        Delete all inventory records for a specific device UUID.
        """
        # Note: This deletes ALL history for the device.
        # Consider adding time range constraints if needed.
        statement = select(DeviceInventory).where(DeviceInventory.device_uuid == device_uuid)
        results = session.exec(statement).all()
        count = len(results)
        if count > 0:
            for obj in results:
                session.delete(obj)
            session.commit()
        return count

    # Override create and update to prevent usage
    def create(self, session: Session, *, obj_in: Dict[str, Any]) -> DeviceInventory:
        raise NotImplementedError("DeviceInventory cannot be created via API.")

    def update(
        self, session: Session, *, db_obj: DeviceInventory, obj_in: Dict[str, Any]
    ) -> DeviceInventory:
        raise NotImplementedError("DeviceInventory cannot be updated via API.")

class SiteGroupCRUD:
    """
    CRUD operations for Site Groups.
    """
    def get_all(self, session: Session, skip: int = 0, limit: int = 100, **kwargs) -> list[SiteGroup]:
        """
        Get all site groups with optional pagination and filtering.
        """
        try:
            logger.debug(f"SiteGroupCRUD get_all: skip={skip}, limit={limit}, kwargs={kwargs}")
            
            query = select(SiteGroup)
            
            # Apply filters from kwargs
            for key, value in kwargs.items():
                if hasattr(SiteGroup, key) and value is not None:
                    logger.debug(f"Applying filter: {key}={value}")
                    query = query.where(getattr(SiteGroup, key) == value)
                else:
                    if not hasattr(SiteGroup, key):
                        logger.warning(f"Model SiteGroup does not have attribute {key}")
            
            logger.debug(f"Executing query: {query}")
            result = session.exec(query.offset(skip).limit(limit)).all()
            logger.debug(f"Query returned {len(result)} results")
            return result
        except Exception as e:
            logger.error(f"Error in SiteGroupCRUD get_all: {str(e)}", exc_info=True)
            raise
    
    def get_by_id(self, session: Session, id: int) -> Optional[SiteGroup]:
        """
        Get a site group by its ID.
        """
        return session.get(SiteGroup, id)
    
    def create(self, session: Session, obj_in: Dict[str, Any]) -> SiteGroup:
        """
        Create a new Site Group.
        """
        try:
            db_obj = SiteGroup(**obj_in)
            session.add(db_obj)
            session.commit()
            session.refresh(db_obj)
            return db_obj
        except Exception as e:
            session.rollback()
            logger.error(f"Error creating site group: {str(e)}", exc_info=True)
            raise
    
    def update_site_group(self, db: Session, id: int, obj_in) -> Optional[SiteGroup]:
        """
        Update a site group by ID.
        """
        db_obj = db.get(SiteGroup, id)
        if not db_obj:
            return None
            
        # Convert Pydantic model to dict if it's not already a dict
        update_data = obj_in
        if not isinstance(obj_in, dict):
            update_data = obj_in.dict(exclude_unset=True)
            
        # Auto-generate slug if name is updated and slug is not provided
        if 'name' in update_data and update_data['name'] and ('slug' not in update_data or not update_data['slug']):
            update_data['slug'] = slugify(update_data['name'])
            logger.debug(f"Auto-generated slug '{update_data['slug']}' from updated name '{update_data['name']}'")
            
        # Update object attributes
        for key, value in update_data.items():
            if hasattr(db_obj, key):
                setattr(db_obj, key, value)
                
        db.add(db_obj)
        db.commit()
        db.refresh(db_obj)
        return db_obj
    
    def remove(self, db: Session, *, id: int) -> Optional[SiteGroup]:
        """
        Delete a site group by ID.
        """
        obj = db.get(SiteGroup, id)
        if not obj:
            return None
            
        db.delete(obj)
        db.commit()
        return obj

class SiteCRUD:
    """
    CRUD operations for Sites.
    """
    def get_all(self, session: Session, skip: int = 0, limit: int = 100, **kwargs) -> list[Site]:
        """
        Get all sites with optional pagination and filtering.
        """
        try:
            logger.debug(f"SiteCRUD get_all: skip={skip}, limit={limit}, kwargs={kwargs}")
            
            query = select(Site)
            
            # Apply filters from kwargs
            for key, value in kwargs.items():
                if hasattr(Site, key) and value is not None:
                    logger.debug(f"Applying filter: {key}={value}")
                    query = query.where(getattr(Site, key) == value)
                else:
                    if not hasattr(Site, key):
                        logger.warning(f"Model Site does not have attribute {key}")
            
            logger.debug(f"Executing query: {query}")
            result = session.exec(query.offset(skip).limit(limit)).all()
            logger.debug(f"Query returned {len(result)} results")
            return result
        except Exception as e:
            logger.error(f"Error in SiteCRUD get_all: {str(e)}", exc_info=True)
            raise
    
    def get_by_id(self, session: Session, id: int) -> Optional[Site]:
        """
        Get a site by its ID.
        """
        return session.get(Site, id)
    
    def create(self, session: Session, obj_in: Dict[str, Any]) -> Site:
        """
        Create a new Site.
        """
        try:
            db_obj = Site(**obj_in)
            session.add(db_obj)
            session.commit()
            session.refresh(db_obj)
            return db_obj
        except Exception as e:
            session.rollback()
            logger.error(f"Error creating site: {str(e)}", exc_info=True)
            raise
    
    def update_site(self, db: Session, id: int, obj_in: Dict[str, Any]) -> Optional[Site]:
        """
        Update a site by ID.
        """
        db_obj = db.get(Site, id)
        if not db_obj:
            return None
            
        for key, value in obj_in.items():
            if hasattr(db_obj, key):
                setattr(db_obj, key, value)
                
        db.add(db_obj)
        db.commit()
        db.refresh(db_obj)
        return db_obj
    
    def remove(self, db: Session, *, id: int) -> Optional[Site]:
        """
        Delete a site by ID.
        """
        obj = db.get(Site, id)
        if not obj:
            return None
            
        db.delete(obj)
        db.commit()
        return obj

class LocationCRUD:
    """
    CRUD operations for Locations.
    """
    def get_all(self, session: Session, skip: int = 0, limit: int = 100, **kwargs) -> list[Location]:
        """
        Get all locations with optional pagination and filtering.
        """
        try:
            logger.debug(f"LocationCRUD get_all: skip={skip}, limit={limit}, kwargs={kwargs}")
            
            query = select(Location)
            
            # Apply filters from kwargs
            for key, value in kwargs.items():
                if hasattr(Location, key) and value is not None:
                    logger.debug(f"Applying filter: {key}={value}")
                    query = query.where(getattr(Location, key) == value)
                else:
                    if not hasattr(Location, key):
                        logger.warning(f"Model Location does not have attribute {key}")
            
            logger.debug(f"Executing query: {query}")
            result = session.exec(query.offset(skip).limit(limit)).all()
            logger.debug(f"Query returned {len(result)} results")
            return result
        except Exception as e:
            logger.error(f"Error in LocationCRUD get_all: {str(e)}", exc_info=True)
            raise
    
    def get_by_id(self, session: Session, id: int) -> Optional[Location]:
        """
        Get a location by its ID.
        """
        return session.get(Location, id)
    
    def create(self, session: Session, obj_in: Dict[str, Any]) -> Location:
        """
        Create a new Location.
        """
        try:
            db_obj = Location(**obj_in)
            session.add(db_obj)
            session.commit()
            session.refresh(db_obj)
            return db_obj
        except Exception as e:
            session.rollback()
            logger.error(f"Error creating location: {str(e)}", exc_info=True)
            raise
    
    def update_location(self, db: Session, id: int, obj_in: Dict[str, Any]) -> Optional[Location]:
        """
        Update a location by ID.
        """
        db_obj = db.get(Location, id)
        if not db_obj:
            return None
            
        for key, value in obj_in.items():
            if hasattr(db_obj, key):
                setattr(db_obj, key, value)
                
        db.add(db_obj)
        db.commit()
        db.refresh(db_obj)
        return db_obj
    
    def remove(self, db: Session, *, id: int) -> Optional[Location]:
        """
        Delete a location by ID.
        """
        obj = db.get(Location, id)
        if not obj:
            return None
            
        db.delete(obj)
        db.commit()
        return obj

class BaseCRUD:
    """
    Generic CRUD operations for models that don't need special handling.
    """
    def __init__(self, model_class):
        self.model_class = model_class
    
    def get_all(self, session: Session, skip: int = 0, limit: int = 100, **kwargs) -> list[Any]:
        """
        Get all records with optional pagination and filtering.
        """
        try:
            logger.debug(f"{self.model_class.__name__}CRUD get_all: skip={skip}, limit={limit}, kwargs={kwargs}")
            
            query = select(self.model_class)
            
            # Apply filters from kwargs
            for key, value in kwargs.items():
                if hasattr(self.model_class, key) and value is not None:
                    logger.debug(f"Applying filter: {key}={value}")
                    query = query.where(getattr(self.model_class, key) == value)
                else:
                    if not hasattr(self.model_class, key):
                        logger.warning(f"Model {self.model_class.__name__} does not have attribute {key}")
            
            logger.debug(f"Executing query: {query}")
            result = session.exec(query.offset(skip).limit(limit)).all()
            logger.debug(f"Query returned {len(result)} results")
            return result
        except Exception as e:
            logger.error(f"Error in {self.model_class.__name__}CRUD get_all: {str(e)}", exc_info=True)
            raise
    
    def get_by_id(self, session: Session, id: int) -> Optional[Any]:
        """
        Get a record by its ID.
        """
        return session.get(self.model_class, id)
    
    def create(self, session: Session, obj_in: Dict[str, Any]) -> Any:
        """
        Create a new record.
        """
        try:
            # Auto-generate slug if model has name and slug fields and slug is not provided
            if ('name' in obj_in and obj_in['name'] and 
                hasattr(self.model_class, 'slug') and 
                ('slug' not in obj_in or not obj_in['slug'])):
                obj_in['slug'] = slugify(obj_in['name'])
                logger.debug(f"Auto-generated slug '{obj_in['slug']}' from name '{obj_in['name']}'")
            
            db_obj = self.model_class(**obj_in)
            session.add(db_obj)
            session.commit()
            session.refresh(db_obj)
            return db_obj
        except Exception as e:
            session.rollback()
            logger.error(f"Error creating {self.model_class.__name__}: {str(e)}", exc_info=True)
            raise
    
    def update(self, session: Session, id: int, obj_in: Dict[str, Any]) -> Optional[Any]:
        """
        Update a record by ID with automatic slug generation.
        """
        try:
            db_obj = session.get(self.model_class, id)
            if not db_obj:
                return None
                
            # Auto-generate slug if name is updated and model has slug field
            if ('name' in obj_in and obj_in['name'] and 
                hasattr(self.model_class, 'slug') and 
                ('slug' not in obj_in or not obj_in['slug'])):
                obj_in['slug'] = slugify(obj_in['name'])
                logger.debug(f"Auto-generated slug '{obj_in['slug']}' from updated name '{obj_in['name']}'")
            
            # Update the object with the new values
            for key, value in obj_in.items():
                if hasattr(db_obj, key):
                    setattr(db_obj, key, value)
            
            session.add(db_obj)
            session.commit()
            session.refresh(db_obj)
            return db_obj
        except Exception as e:
            session.rollback()
            logger.error(f"Error updating {self.model_class.__name__}: {str(e)}", exc_info=True)
            raise
    
    def remove(self, db: Session, *, id: int) -> Optional[Any]:
        """
        Delete a record by ID.
        """
        obj = db.get(self.model_class, id)
        if not obj:
            return None
            
        db.delete(obj)
        db.commit()
        return obj

# Instantiate CRUD objects
region = RegionCRUD()
site_group = SiteGroupCRUD()
site = SiteCRUD()
location = LocationCRUD()
class VRFCRUD:
    """
    CRUD operations for VRF model with special handling for route targets.
    """
    def get_all(self, session: Session, skip: int = 0, limit: int = 100, **kwargs) -> list[VRF]:
        """
        Get all VRFs with optional pagination and filtering.
        """
        try:
            logger.debug(f"VRFCRUD get_all: skip={skip}, limit={limit}, kwargs={kwargs}")
            
            query = select(VRF)
            
            # Apply filters from kwargs
            for key, value in kwargs.items():
                if hasattr(VRF, key) and value is not None:
                    logger.debug(f"Applying filter: {key}={value}")
                    query = query.where(getattr(VRF, key) == value)
                else:
                    if not hasattr(VRF, key):
                        logger.warning(f"Model VRF does not have attribute {key}")
            
            logger.debug(f"Executing query: {query}")
            result = session.exec(query.offset(skip).limit(limit)).all()
            logger.debug(f"Query returned {len(result)} results")
            return result
        except Exception as e:
            logger.error(f"Error in VRFCRUD get_all: {str(e)}", exc_info=True)
            raise
    
    def get_by_id(self, session: Session, id: int) -> Optional[VRF]:
        """
        Get a VRF by its ID.
        """
        return session.get(VRF, id)
    
    def create(self, session: Session, obj_in: Dict[str, Any]) -> VRF:
        """
        Create a new VRF with import and export targets.
        """
        try:
            # Extract route target IDs if present
            import_target_ids = obj_in.pop('import_target_ids', [])
            export_target_ids = obj_in.pop('export_target_ids', [])
            
            # Generate slug from name if not provided
            if 'name' in obj_in and ('slug' not in obj_in or not obj_in['slug']):
                obj_in['slug'] = slugify(obj_in['name'])
                logger.debug(f"Generated slug '{obj_in['slug']}' from name '{obj_in['name']}'")
            
            # Create the VRF
            db_obj = VRF(**obj_in)
            session.add(db_obj)
            session.flush()  # Get the ID without committing
            
            # Add import targets
            if import_target_ids:
                for rt_id in import_target_ids:
                    import_link = VRFImportTargets(vrf_id=db_obj.id, route_target_id=rt_id)
                    session.add(import_link)
            
            # Add export targets
            if export_target_ids:
                for rt_id in export_target_ids:
                    export_link = VRFExportTargets(vrf_id=db_obj.id, route_target_id=rt_id)
                    session.add(export_link)
            
            # Commit all changes
            session.commit()
            session.refresh(db_obj)
            return db_obj
        except Exception as e:
            session.rollback()
            logger.error(f"Error creating VRF: {str(e)}", exc_info=True)
            raise
    
    def update_vrf(self, db: Session, vrf_id: int, vrf_in) -> Optional[VRF]:
        """
        Update a VRF by ID, including import and export targets.
        """
        try:
            # Get the VRF to update
            db_obj = db.get(VRF, vrf_id)
            if not db_obj:
                logger.warning(f"VRF with ID {vrf_id} not found for update")
                return None
            
            # Convert Pydantic model to dict if needed
            if hasattr(vrf_in, 'model_dump'):
                # For Pydantic v2
                vrf_dict = vrf_in.model_dump(exclude_unset=True)
            elif hasattr(vrf_in, 'dict'):
                # For Pydantic v1
                vrf_dict = vrf_in.dict(exclude_unset=True)
            else:
                # Already a dict
                vrf_dict = vrf_in
            
            # Extract route target IDs
            import_target_ids = None
            export_target_ids = None
            
            if hasattr(vrf_in, 'import_target_ids'):
                import_target_ids = vrf_in.import_target_ids
            elif 'import_target_ids' in vrf_dict:
                import_target_ids = vrf_dict.pop('import_target_ids', None)
                
            if hasattr(vrf_in, 'export_target_ids'):
                export_target_ids = vrf_in.export_target_ids
            elif 'export_target_ids' in vrf_dict:
                export_target_ids = vrf_dict.pop('export_target_ids', None)
            
            # Update slug if name is changing
            if 'name' in vrf_dict and vrf_dict['name']:
                vrf_dict['slug'] = slugify(vrf_dict['name'])
                logger.debug(f"Generated slug '{vrf_dict['slug']}' from name '{vrf_dict['name']}'")
            
            # Update basic VRF fields
            for key, value in vrf_dict.items():
                if hasattr(db_obj, key) and value is not None:
                    setattr(db_obj, key, value)
            
            # Update import targets if provided
            if import_target_ids is not None:
                # Remove existing import targets
                db.query(VRFImportTargets).filter(VRFImportTargets.vrf_id == vrf_id).delete()
                
                # Add new import targets
                for rt_id in import_target_ids:
                    import_link = VRFImportTargets(vrf_id=vrf_id, route_target_id=rt_id)
                    db.add(import_link)
            
            # Update export targets if provided
            if export_target_ids is not None:
                # Remove existing export targets
                db.query(VRFExportTargets).filter(VRFExportTargets.vrf_id == vrf_id).delete()
                
                # Add new export targets
                for rt_id in export_target_ids:
                    export_link = VRFExportTargets(vrf_id=vrf_id, route_target_id=rt_id)
                    db.add(export_link)
            
            # Commit all changes
            db.add(db_obj)
            db.commit()
            db.refresh(db_obj)
            
            return db_obj
        except Exception as e:
            db.rollback()
            logger.error(f"Error updating VRF {vrf_id}: {str(e)}", exc_info=True)
            raise
    
    def remove(self, db: Session, *, id: int) -> Optional[VRF]:
        """
        Delete a VRF by ID.
        """
        try:
            obj = db.get(VRF, id)
            if not obj:
                return None
            
            # Delete related import/export targets
            db.query(VRFImportTargets).filter(VRFImportTargets.vrf_id == id).delete()
            db.query(VRFExportTargets).filter(VRFExportTargets.vrf_id == id).delete()
            
            # Delete the VRF
            db.delete(obj)
            db.commit()
            return obj
        except Exception as e:
            db.rollback()
            logger.error(f"Error deleting VRF {id}: {str(e)}", exc_info=True)
            raise

vrf = VRFCRUD()
rir = BaseCRUD(RIR)
aggregate = BaseCRUD(Aggregate)
role = BaseCRUD(Role)
prefix = PrefixCRUD()
ip_range = BaseCRUD(IPRange)
ip_address = IPAddressCRUD()
tenant = BaseCRUD(Tenant)
device = BaseCRUD(Device)
interface = BaseCRUD(Interface)
vlan = BaseCRUD(VLAN)
vlan_group = BaseCRUD(VLANGroup)
asn = BaseCRUD(ASN)
asn_range = BaseCRUD(ASNRange)
route_target = BaseCRUD(RouteTarget)
credential = CredentialCRUD()
platform_type = PlatformTypeCRUD()
net_job = NetJobCRUD()
device_inventory = DeviceInventoryCRUD()
ip_address = IPAddressCRUD()
