from datetime import datetime, timedelta
from typing import Optional, Union, Any, cast
from jose import JWTError, jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlmodel import Session, select, text
from sqlalchemy import text as sa_text
from pydantic import ValidationError

from ..database import get_session
from ..models.user import User
from ..models.tenant import Tenant
from ..schemas.auth import TokenData

# Configuration
SECRET_KEY = "YOUR_SECRET_KEY"  # Should be in environment variables or settings
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24  # 24 hours

# OAuth2 scheme for token validation
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="api/v1/auth/token")

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """Create a JWT token with the provided data and expiration time."""
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_session)) -> User:
    """Get the current user from the token."""
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        # Cast to string and handle None safely
        username = cast(str, payload.get("sub"))
        if username is None:
            raise credentials_exception
        
        # Handle potentially None values safely
        user_id = payload.get("user_id")
        tenant_id = payload.get("tenant_id")
        is_superuser = bool(payload.get("is_superuser", False))
        
        token_data = TokenData(
            username=username,
            tenant_id=tenant_id,
            user_id=user_id,
            is_superuser=is_superuser
        )
    except (JWTError, ValidationError):
        raise credentials_exception
    
    user = db.exec(select(User).where(User.username == token_data.username)).first()
    if user is None:
        raise credentials_exception
    
    if not user.is_active:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Inactive user")
    
    # Set PostgreSQL session variable for tenant context
    if user.tenant_id and not user.is_superuser:
        # Use execute instead of exec for raw SQL with sa_text
        db.execute(sa_text(f"SET app.current_tenant_id = '{user.tenant_id}'"))
    elif user.is_superuser:
        # Superusers can access all tenants' data
        db.execute(sa_text("SET app.current_tenant_id = NULL"))
    
    return user

def get_current_active_user(current_user: User = Depends(get_current_user)) -> User:
    """Get the current active user."""
    if not current_user.is_active:
        raise HTTPException(status_code=400, detail="Inactive user")
    return current_user

def get_current_superuser(current_user: User = Depends(get_current_user)) -> User:
    """Get the current superuser."""
    if not current_user.is_superuser:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions"
        )
    return current_user

def get_user_tenant(db: Session, user: User) -> Optional[Tenant]:
    """Get the tenant associated with the user."""
    if not user.tenant_id:
        return None
    return db.exec(select(Tenant).where(Tenant.id == user.tenant_id)).first() 