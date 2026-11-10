"""
Authentication and user session router.

Provides endpoints for logging in, fetching current user details, creating new
accounts, and retrieving past evaluation records from the SQLite database.
"""

from typing import Dict, Any, List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from backend.core.database import db
from backend.core.auth import hash_password, verify_password, create_access_token, get_current_user

router = APIRouter(prefix="/auth", tags=["Authentication"])


class LoginRequest(BaseModel):
    """
    Request model for user credential submission.
    """
    username: str = Field(..., description="User login handle")
    password: str = Field(..., description="User plaintext password")


class RegisterRequest(BaseModel):
    """
    Request model for new account registration.
    """
    username: str = Field(..., min_length=3, max_length=50)
    password: str = Field(..., min_length=4)
    full_name: Optional[str] = Field(default="")
    email: Optional[str] = Field(default="")
    role: Optional[str] = Field(default="Professor")
    department: Optional[str] = Field(default="")
    gemini_api_key: Optional[str] = Field(default="")


class AuthResponse(BaseModel):
    """
    Standard successful authentication payload containing JWT access token.
    """
    access_token: str
    token_type: str = "bearer"
    username: str
    user_id: int


class UserProfileResponse(BaseModel):
    """
    Profile information for the authenticated user.
    """
    id: int
    username: str
    created_at: str


@router.post("/login", response_model=AuthResponse)
async def login(credentials: LoginRequest) -> AuthResponse:
    """
    Validates user credentials and issues a signed JWT Bearer access token.
    """
    user = db.get_user_by_username(credentials.username)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password."
        )

    if not verify_password(credentials.password, user["password_hash"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password."
        )

    token = create_access_token(data={"sub": user["username"], "user_id": user["id"]})
    return AuthResponse(
        access_token=token,
        token_type="bearer",
        username=user["username"],
        user_id=user["id"]
    )


@router.post("/register", response_model=AuthResponse)
async def register(payload: RegisterRequest) -> AuthResponse:
    """
    Registers a new user handle, generates a salted bcrypt hash, and returns a token.
    """
    existing = db.get_user_by_username(payload.username)
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username already taken."
        )

    pwd_hash = hash_password(payload.password)
    user_id = db.create_user(
        username=payload.username,
        password_hash=pwd_hash,
        full_name=payload.full_name or payload.username,
        email=payload.email or "",
        role=payload.role or "Professor",
        department=payload.department or "",
        gemini_api_key=payload.gemini_api_key or ""
    )
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to register account."
        )

    token = create_access_token(data={"sub": payload.username, "user_id": user_id})
    return AuthResponse(
        access_token=token,
        token_type="bearer",
        username=payload.username,
        user_id=user_id
    )


@router.get("/me", response_model=UserProfileResponse)
async def get_current_user_profile(current_user: Dict[str, Any] = Depends(get_current_user)) -> UserProfileResponse:
    """
    Returns identity and metadata of the currently authenticated user.
    """
    return UserProfileResponse(
        id=current_user["id"],
        username=current_user["username"],
        created_at=str(current_user["created_at"])
    )


@router.get("/history", response_model=List[Dict[str, Any]])
async def get_user_evaluation_history(current_user: Dict[str, Any] = Depends(get_current_user)) -> List[Dict[str, Any]]:
    """
    Returns a history list of scorecards evaluated by the authenticated user.
    """
    return db.list_user_scorecards(current_user["id"])
