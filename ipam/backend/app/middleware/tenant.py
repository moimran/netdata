from fastapi import Request
from starlette.middleware.base import BaseHTTPMiddleware
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
import logging
from typing import Optional
from ..database import engine

# Configure logging
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

class TenantMiddleware(BaseHTTPMiddleware):
    """
    Middleware to handle setting tenant context based on the authenticated user.
    """
    async def dispatch(self, request: Request, call_next):
        # Process the request
        response = await call_next(request)
        
        # No need to clean up PostgreSQL session variables as they're session-scoped
        return response

def get_tenant_id_from_request(request: Request) -> Optional[str]:
    """
    Extract tenant ID from the JWT token in the request.
    This is a utility function that could be used in routes where middleware isn't sufficient.
    """
    # This would be called within routes when accessing the current user
    user = getattr(request.state, "user", None)
    if user and hasattr(user, "tenant_id") and user.tenant_id:
        return str(user.tenant_id)
    return None 