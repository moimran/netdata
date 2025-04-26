from fastapi import APIRouter
from .prefix import router as prefix_router
from .vrf import router as vrf_router
from .devices import router as devices_router
from .credential import router as credential_router
from .auth import router as auth_router

router = APIRouter()

# Include all endpoint routers
router.include_router(prefix_router, tags=["Prefixes"])
router.include_router(vrf_router, tags=["VRF"])
router.include_router(devices_router, tags=["Devices"])
router.include_router(credential_router, tags=["Credentials"])
router.include_router(auth_router, tags=["Authentication"])
