from datetime import timedelta
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlmodel import Session, select
import uuid

from app.database import get_session
from app.models.user import User
from app.models.tenant import Tenant
from app.schemas.auth import Token, UserCreate, UserRead, LoginRequest
from app.utils.auth import (
    create_access_token, 
    get_current_user,
    get_current_active_user,
    get_current_superuser,
    ACCESS_TOKEN_EXPIRE_MINUTES
)

router = APIRouter(prefix="/auth", tags=["Authentication"])

@router.post("/token", response_model=Token)
def login_for_access_token(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_session)
):
    user = db.exec(select(User).where(User.username == form_data.username)).first()
    if not user or not User.verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    
    # Get tenant information
    tenant_id = str(user.tenant_id) if user.tenant_id else None
    
    # Create token with tenant context
    token_data = {
        "sub": user.username,
        "user_id": str(user.id),
        "tenant_id": tenant_id,
        "is_superuser": user.is_superuser
    }
    
    access_token = create_access_token(
        data=token_data, 
        expires_delta=access_token_expires
    )
    
    return Token(
        access_token=access_token,
        token_type="bearer",
        user_id=str(user.id),
        tenant_id=tenant_id,
        username=user.username,
        is_superuser=user.is_superuser
    )

@router.post("/login", response_model=Token)
def login(login_data: LoginRequest, db: Session = Depends(get_session)):
    """
    More user-friendly login endpoint that accepts JSON instead of form data
    """
    user = db.exec(select(User).where(User.username == login_data.username)).first()
    if not user or not User.verify_password(login_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    
    # Get tenant information
    tenant_id = str(user.tenant_id) if user.tenant_id else None
    
    # Create token with tenant context
    token_data = {
        "sub": user.username,
        "user_id": str(user.id),
        "tenant_id": tenant_id,
        "is_superuser": user.is_superuser
    }
    
    access_token = create_access_token(
        data=token_data, 
        expires_delta=access_token_expires
    )
    
    return Token(
        access_token=access_token,
        token_type="bearer",
        user_id=str(user.id),
        tenant_id=tenant_id,
        username=user.username,
        is_superuser=user.is_superuser
    )

@router.post("/register", response_model=UserRead, status_code=status.HTTP_201_CREATED)
def register_user(user_create: UserCreate, db: Session = Depends(get_session)):
    """
    Register a new user
    """
    # Check if username exists
    existing_user = db.exec(select(User).where(User.username == user_create.username)).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username already registered"
        )
    
    # Check if email exists
    existing_email = db.exec(select(User).where(User.email == user_create.email)).first()
    if existing_email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    
    # Check tenant exists if specified
    tenant_name = None
    if user_create.tenant_id:
        tenant = db.exec(select(Tenant).where(Tenant.id == uuid.UUID(user_create.tenant_id))).first()
        if not tenant:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Specified tenant does not exist"
            )
        tenant_name = tenant.name
    
    # Create new user
    hashed_password = User.get_password_hash(user_create.password)
    db_user = User(
        username=user_create.username,
        email=user_create.email,
        hashed_password=hashed_password,
        is_active=user_create.is_active,
        is_superuser=user_create.is_superuser,
        tenant_id=uuid.UUID(user_create.tenant_id) if user_create.tenant_id else None
    )
    
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    
    # Prepare response
    user_read = UserRead(
        id=str(db_user.id),
        username=db_user.username,
        email=db_user.email,
        is_active=db_user.is_active,
        is_superuser=db_user.is_superuser,
        tenant_id=str(db_user.tenant_id) if db_user.tenant_id else None,
        tenant_name=tenant_name,
        created_at=db_user.created_at,
        updated_at=db_user.updated_at
    )
    
    return user_read

@router.get("/me", response_model=UserRead)
def read_users_me(current_user: User = Depends(get_current_active_user), db: Session = Depends(get_session)):
    """
    Get current user information
    """
    # Get tenant name if user has a tenant
    tenant_name = None
    if current_user.tenant_id:
        tenant = db.exec(select(Tenant).where(Tenant.id == current_user.tenant_id)).first()
        if tenant:
            tenant_name = tenant.name
    
    # Prepare response
    user_read = UserRead(
        id=str(current_user.id),
        username=current_user.username,
        email=current_user.email,
        is_active=current_user.is_active,
        is_superuser=current_user.is_superuser,
        tenant_id=str(current_user.tenant_id) if current_user.tenant_id else None,
        tenant_name=tenant_name,
        created_at=current_user.created_at,
        updated_at=current_user.updated_at
    )
    
    return user_read 