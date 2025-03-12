"""
Script to migrate existing data after schema changes:
- Remove name and slug from prefix
- Remove interface_id from ip_addresses
- Add ip_address_id to interfaces
"""
from sqlalchemy.orm import Session
from sqlalchemy import select, text
import logging
import sys
import os

# Add the parent directory to the path so we can import the app modules
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.database import engine
from app.models import IPAddress, Interface, Device, Prefix

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

def migrate_interface_ip_relationships():
    """
    Migrate existing interface-ip relationships to the new schema.
    
    Before: IPAddress has interface_id pointing to Interface
    After: Interface has ip_address_id pointing to IPAddress
    """
    logger.info("Starting migration of interface-IP relationships")
    
    with Session(engine) as session:
        # Get all IP addresses with interface_id (from the database before migration)
        # This assumes we've already run the migration but the data still exists in the database
        # We'll use raw SQL to access the interface_id column that might be removed from the model
        result = session.execute(text("SELECT id, interface_id FROM ip_addresses WHERE interface_id IS NOT NULL"))
        ip_addresses = result.fetchall()
        
        logger.info(f"Found {len(ip_addresses)} IP addresses with interface_id")
        
        for ip in ip_addresses:
            ip_id = ip[0]
            interface_id = ip[1]
            
            # Update the interface with the ip_address_id using raw SQL
            # This avoids issues with the ORM model not matching the current database schema
            try:
                # Check if the ip_address_id column exists
                column_check = session.execute(text(
                    "SELECT column_name FROM information_schema.columns "
                    "WHERE table_name = 'interfaces' AND column_name = 'ip_address_id'"
                ))
                if column_check.fetchone():
                    # Column exists, update it
                    session.execute(
                        text("UPDATE interfaces SET ip_address_id = :ip_id WHERE id = :interface_id"),
                        {"ip_id": ip_id, "interface_id": interface_id}
                    )
                    logger.info(f"Updated interface {interface_id} with ip_address_id {ip_id}")
                else:
                    logger.warning("ip_address_id column does not exist in interfaces table. "
                                  "Run Alembic migration first.")
            except Exception as e:
                logger.error(f"Error updating interface {interface_id}: {str(e)}")
        
        session.commit()
        logger.info("Interface-IP relationship migration completed")

def migrate_device_ip_relationships():
    """
    Update device IP references to use ip_address_id instead of dns_name.
    """
    logger.info("Starting migration of device-IP relationships")
    
    with Session(engine) as session:
        try:
            # Check if devices have dns_name and ip_address_id columns
            device_columns = session.execute(text(
                "SELECT column_name FROM information_schema.columns "
                "WHERE table_name = 'devices' AND column_name IN ('dns_name', 'ip_address_id')"
            )).fetchall()
            
            device_columns = [col[0] for col in device_columns]
            
            if 'dns_name' not in device_columns or 'ip_address_id' not in device_columns:
                logger.warning("Required columns missing in devices table. "
                              "Run Alembic migration first.")
                return
            
            # Get all devices with dns_name but no ip_address_id
            devices = session.execute(text(
                "SELECT id, dns_name FROM devices "
                "WHERE dns_name IS NOT NULL AND (ip_address_id IS NULL OR ip_address_id = 0)"
            )).fetchall()
            
            logger.info(f"Found {len(devices)} devices with dns_name but no ip_address_id")
            
            for device in devices:
                device_id = device[0]
                dns_name = device[1]
                
                # Find IP address with matching dns_name
                ip = session.execute(text(
                    "SELECT id FROM ip_addresses WHERE dns_name = :dns_name"
                ), {"dns_name": dns_name}).fetchone()
                
                if ip:
                    ip_id = ip[0]
                    # Update the device with the ip_address_id
                    session.execute(text(
                        "UPDATE devices SET ip_address_id = :ip_id WHERE id = :device_id"
                    ), {"ip_id": ip_id, "device_id": device_id})
                    
                    logger.info(f"Updated device {device_id} with ip_address_id {ip_id}")
                else:
                    logger.warning(f"No IP address found with dns_name {dns_name} for device {device_id}")
        except Exception as e:
            logger.error(f"Error in device-IP migration: {str(e)}", exc_info=True)
            return
        
        session.commit()
        logger.info("Device-IP relationship migration completed")

def main():
    """Main migration function"""
    logger.info("Starting data migration")
    
    try:
        # Check if the Alembic migration has been run
        with Session(engine) as session:
            # Check for ip_address_id column in interfaces table
            ip_address_id_exists = session.execute(text(
                "SELECT EXISTS (SELECT 1 FROM information_schema.columns "
                "WHERE table_name = 'interfaces' AND column_name = 'ip_address_id')"
            )).scalar()
            
            # Check if interface_id still exists in ip_addresses table
            interface_id_exists = session.execute(text(
                "SELECT EXISTS (SELECT 1 FROM information_schema.columns "
                "WHERE table_name = 'ip_addresses' AND column_name = 'interface_id')"
            )).scalar()
            
            if not ip_address_id_exists:
                logger.warning("The ip_address_id column does not exist in the interfaces table.")
                logger.warning("Please run the Alembic migration first:")
                logger.warning("  cd ipam/backend")
                logger.warning("  alembic upgrade heads")
                logger.warning("Note: Use 'heads' (plural) instead of 'head' to handle multiple migration branches")
                return
            
            if not interface_id_exists:
                logger.warning("The interface_id column no longer exists in the ip_addresses table.")
                logger.warning("The migration has already been applied.")
                return
        
        # Run the migration
        migrate_interface_ip_relationships()
        migrate_device_ip_relationships()
        logger.info("Data migration completed successfully")
    except Exception as e:
        logger.error(f"Error during migration: {str(e)}", exc_info=True)
        logger.error("Migration failed. Please check the logs for details.")

if __name__ == "__main__":
    main()