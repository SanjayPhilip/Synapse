from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from jose import jwt, JWTError
from datetime import timedelta
from app.database import get_db
from app.models import Profile
from app.schemas.auth import UserRegister, UserLogin, TokenResponse, ProfileResponse, ProfileUpdate, ForgotPasswordRequest, PasswordResetRequest, VerifyEmailRequest, VerifyEmailResponse
from app.middleware.auth import hash_password, verify_password, create_access_token, get_current_user
from app.middleware.rate_limit import rate_limiter
from app.config import get_settings

router = APIRouter(prefix="/api/v1/auth", tags=["auth"])


@router.post("/register", response_model=TokenResponse)
async def register(
    data: UserRegister,
    db: AsyncSession = Depends(get_db),
    _: None = Depends(rate_limiter(5, 60)),
):
    result = await db.execute(select(Profile).where(Profile.email == data.email))
    if result.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Email already registered")

    user = Profile(
        email=data.email,
        full_name=data.full_name,
        role=data.role,
        company_name=data.company_name,
    )
    user.password_hash = hash_password(data.password)
    user.is_verified = False
    db.add(user)
    await db.flush()

    verify_token = create_access_token(
        {"sub": str(user.id), "purpose": "email_verify"},
        expires_delta=timedelta(minutes=30),
    )

    token = create_access_token({"sub": str(user.id), "role": user.role})
    return TokenResponse(
        access_token=token,
        user={
            "id": str(user.id),
            "email": user.email,
            "full_name": user.full_name,
            "role": user.role,
            "company_name": user.company_name,
            "is_verified": False,
            "verify_token": verify_token,
        },
    )


@router.post("/login", response_model=TokenResponse)
async def login(
    data: UserLogin,
    db: AsyncSession = Depends(get_db),
    _: None = Depends(rate_limiter(10, 60)),
):
    result = await db.execute(select(Profile).where(Profile.email == data.email))
    user = result.scalars().first()
    if not user or not verify_password(data.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    if not user.is_verified:
        raise HTTPException(
            status_code=403,
            detail="Email not verified. Check your inbox or use the demo verify link.",
        )

    token = create_access_token({"sub": str(user.id), "role": user.role})
    return TokenResponse(
        access_token=token,
        user={
            "id": str(user.id),
            "email": user.email,
            "full_name": user.full_name,
            "role": user.role,
            "company_name": user.company_name,
            "is_verified": True,
        },
    )


@router.post("/verify-email", response_model=VerifyEmailResponse)
async def verify_email(
    data: VerifyEmailRequest,
    db: AsyncSession = Depends(get_db),
    _: None = Depends(rate_limiter(10, 60)),
):
    try:
        payload = jwt.decode(data.token, get_settings().SECRET_KEY, algorithms=[get_settings().ALGORITHM])
    except JWTError:
        raise HTTPException(status_code=400, detail="Invalid or expired token")

    if payload.get("purpose") != "email_verify" or not payload.get("sub"):
        raise HTTPException(status_code=400, detail="Invalid verification token")

    user_id = payload["sub"]
    result = await db.execute(select(Profile).where(Profile.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="Account not found")

    if user.is_verified:
        return VerifyEmailResponse(message="Account already verified. You can now log in.")

    user.is_verified = True
    await db.flush()
    print(f"[demo] Email verified for {user.email}")
    return VerifyEmailResponse(message="Email verified successfully. You can now log in.")


@router.post("/forgot-password")
async def forgot_password(
    data: ForgotPasswordRequest,
    db: AsyncSession = Depends(get_db),
    _: None = Depends(rate_limiter(3, 60)),
):
    result = await db.execute(select(Profile).where(Profile.email == data.email))
    user = result.scalars().first()
    if not user:
        return {"message": "If an account exists with that email, a reset link has been sent.", "reset_token": None}

    token = create_access_token(
        {"sub": str(user.id), "purpose": "password_reset"},
        expires_delta=timedelta(minutes=30),
    )
    print(f"[demo] Password reset link for {data.email}: /reset-password?token={token}")
    return {"message": "Reset link generated (valid 30 minutes).", "reset_token": token}


@router.post("/reset-password")
async def reset_password(data: PasswordResetRequest, db: AsyncSession = Depends(get_db)):
    try:
        payload = jwt.decode(data.token, get_settings().SECRET_KEY, algorithms=[get_settings().ALGORITHM])
    except JWTError:
        raise HTTPException(status_code=400, detail="Invalid or expired reset token")

    if payload.get("purpose") != "password_reset" or not payload.get("sub"):
        raise HTTPException(status_code=400, detail="Invalid reset token")

    result = await db.execute(select(Profile).where(Profile.id == payload["sub"]))
    user = result.scalars().first()
    if not user:
        raise HTTPException(status_code=404, detail="Account no longer exists")

    user.password_hash = hash_password(data.new_password)
    await db.flush()
    return {"message": "Password updated successfully. You can now log in with your new password."}


@router.get("/me", response_model=ProfileResponse)
async def get_me(current_user: Profile = Depends(get_current_user)):
    return current_user


@router.put("/me", response_model=ProfileResponse)
async def update_me(
    data: ProfileUpdate,
    current_user: Profile = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    for key, value in data.model_dump(exclude_unset=True).items():
        setattr(current_user, key, value)
    await db.flush()
    return current_user
