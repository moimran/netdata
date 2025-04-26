"""
Dependencies for FastAPI authentication and other endpoints.
"""
from fastapi import Depends, HTTPException, status
from sqlmodel import Session

from app.database import get_session
from app.models.user import User
from app.utils.auth import get_current_user, get_current_active_user, get_current_superuser

# Alias get_session as get_db for backward compatibility
get_db = get_session

# Re-export these functions so they can be imported from app.api.deps
__all__ = [
    "get_session", 
    "get_db", 
    "get_current_user", 
    "get_current_active_user",
    "get_current_superuser"
] 