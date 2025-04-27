from fastapi import APIRouter
from .prefix import router as prefix_router
from .vrf import router as vrf_router
# from .devices import router as devices_router  # Comment out if this module doesn't exist yet
# Removed custom credential router as we're using auto-generated CRUD routes
# from .credential import router as credential_router
from .auth import router as auth_router
from .arp import router as arp_router
# Removed custom deviceinventory router as we're using auto-generated CRUD routes
# from .deviceinventory import router as deviceinventory_router
# Removed custom platform router as we're using auto-generated CRUD routes
# from .platform import router as platform_router
# Removed custom interface router as we're using auto-generated CRUD routes
# from .interface import router as interface_router
from .reference import router as reference_router
# Removed custom regions router as we're using auto-generated CRUD routes
# from .regions import router as regions_router

router = APIRouter()

# Include all endpoint routers
# Auth router first for visibility
router.include_router(auth_router, prefix="/auth", tags=["Authentication"])  # Add explicit auth prefix
# Other routers
router.include_router(prefix_router, tags=["Prefixes"])
router.include_router(vrf_router, tags=["VRF"])
# router.include_router(devices_router, tags=["Devices"])  # Comment out if this module doesn't exist yet
# Removed custom credential router as we're using auto-generated CRUD routes
# router.include_router(credential_router, tags=["Credentials"])
router.include_router(arp_router, tags=["ARP Table"])
# Removed custom deviceinventory router as we're using auto-generated CRUD routes
# router.include_router(deviceinventory_router, tags=["Device Inventory"])
# Removed custom platform router as we're using auto-generated CRUD routes
# router.include_router(platform_router, tags=["Platform Types"])
# Removed custom interface router as we're using auto-generated CRUD routes
# router.include_router(interface_router, tags=["Interfaces"])
# Removed custom regions router as we're using auto-generated CRUD routes
# router.include_router(regions_router, tags=["Regions"])
router.include_router(reference_router, tags=["Reference Data"])

# Print debug info about registered routes
import logging
logger = logging.getLogger(__name__)
try:
    logger.info(f"Auth router registered with routes: {[str(route) for route in auth_router.routes]}")
except Exception as e:
    logger.info(f"Auth router registered, could not inspect routes: {e}")
