from fastapi import APIRouter
from .credential import router as credential_router
from .device import router as device_router
from .prefix import router as prefix_router

router = APIRouter()

# Include all endpoint routers
router.include_router(credential_router, tags=["Credentials"])
router.include_router(device_router, tags=["Devices"])
router.include_router(prefix_router, tags=["Prefixes"])
