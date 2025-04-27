from fastapi import APIRouter
from .prefix import router as prefix_router
from .vrf import router as vrf_router
# from .devices import router as devices_router  # Comment out if this module doesn't exist yet
from .credential import router as credential_router
from .auth import router as auth_router
from .arp import router as arp_router
from .deviceinventory import router as deviceinventory_router
from .platform import router as platform_router
from .interface import router as interface_router

router = APIRouter()

# Include all endpoint routers
# Auth router first for visibility
router.include_router(auth_router, prefix="/auth", tags=["Authentication"])  # Add explicit auth prefix
# Other routers
router.include_router(prefix_router, tags=["Prefixes"])
router.include_router(vrf_router, tags=["VRF"])
# router.include_router(devices_router, tags=["Devices"])  # Comment out if this module doesn't exist yet
router.include_router(credential_router, tags=["Credentials"])
router.include_router(arp_router, tags=["ARP Table"])
router.include_router(deviceinventory_router, tags=["Device Inventory"])
router.include_router(platform_router, tags=["Platform Types"])
router.include_router(interface_router, tags=["Interfaces"])

# Print debug info about registered routes
import logging
logger = logging.getLogger(__name__)
try:
    logger.info(f"Auth router registered with routes: {[str(route) for route in auth_router.routes]}")
except Exception as e:
    logger.info(f"Auth router registered, could not inspect routes: {e}")
