from fastapi import APIRouter
from .prefix import router as prefix_router
from .vrf import router as vrf_router
# from .devices import router as devices_router  # Comment out if this module doesn't exist yet
from .credential import router as credential_router
from .auth import router as auth_router

router = APIRouter()

# Include all endpoint routers
# Auth router first for visibility
router.include_router(auth_router, prefix="/auth", tags=["Authentication"])  # Add explicit auth prefix
# Other routers
router.include_router(prefix_router, tags=["Prefixes"])
router.include_router(vrf_router, tags=["VRF"])
# router.include_router(devices_router, tags=["Devices"])  # Comment out if this module doesn't exist yet
router.include_router(credential_router, tags=["Credentials"])

# Print debug info about registered routes
import logging
logger = logging.getLogger(__name__)
try:
    logger.info(f"Auth router registered with routes: {[str(route) for route in auth_router.routes]}")
except Exception as e:
    logger.info(f"Auth router registered, could not inspect routes: {e}")
