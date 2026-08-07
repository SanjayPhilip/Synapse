import os
import uuid
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.models import Profile, DEFAULT_NOTIFICATION_PREFS
from app.schemas.profile import ProfileUpdate, ProfileResponse, AvatarUploadResponse
from app.middleware.auth import get_current_user
from app.storage import get_storage_backend, validate_avatar, generate_avatar_key, delete_avatar

router = APIRouter(prefix="/api/v1/profile", tags=["profile"])

storage = get_storage_backend()


@router.get("/me", response_model=ProfileResponse)
async def get_profile(current_user: Profile = Depends(get_current_user)):
    return current_user


@router.put("/me", response_model=ProfileResponse)
async def update_profile(
    data: ProfileUpdate,
    current_user: Profile = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    updates = data.model_dump(exclude_unset=True)

    # Merge over defaults so partial pref updates never drop a notification category.
    provided_prefs = updates.get("notification_prefs")
    if isinstance(provided_prefs, dict):
        updates["notification_prefs"] = {**DEFAULT_NOTIFICATION_PREFS, **provided_prefs}

    for key, value in updates.items():
        setattr(current_user, key, value)
    await db.flush()
    await db.refresh(current_user)
    return current_user


@router.post("/avatar", response_model=AvatarUploadResponse)
async def upload_avatar(
    file: UploadFile = File(...),
    current_user: Profile = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    content = await file.read()
    if not content:
        raise HTTPException(status_code=400, detail="Empty file")

    is_valid, error = validate_avatar(content, file.filename or "")
    if not is_valid:
        raise HTTPException(status_code=400, detail=error)

    # Delete old avatar if exists
    if current_user.avatar_url:
        delete_avatar(storage, current_user.avatar_url)

    # Save new avatar
    key = generate_avatar_key(str(current_user.id), file.filename or "avatar.png")
    content_type = file.content_type or "image/png"
    url = storage.save(key, content, content_type)

    current_user.avatar_url = url
    await db.flush()
    await db.refresh(current_user)
    return AvatarUploadResponse(url=current_user.avatar_url)


@router.delete("/avatar", response_model=ProfileResponse)
async def delete_avatar_endpoint(
    current_user: Profile = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if current_user.avatar_url:
        delete_avatar(storage, current_user.avatar_url)
        current_user.avatar_url = None
    await db.flush()
    await db.refresh(current_user)
    return current_user