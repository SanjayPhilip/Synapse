import os
import uuid
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.models import Profile, DEFAULT_NOTIFICATION_PREFS
from app.schemas.profile import ProfileUpdate, ProfileResponse, AvatarUploadResponse
from app.middleware.auth import get_current_user

router = APIRouter(prefix="/api/v1/profile", tags=["profile"])

STORAGE_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "storage")
AVATAR_DIR = os.path.join(STORAGE_DIR, "avatars")
ALLOWED_AVATAR_EXTS = {"jpg", "jpeg", "png", "gif", "webp"}
MAX_AVATAR_SIZE = 5 * 1024 * 1024

os.makedirs(AVATAR_DIR, exist_ok=True)


def avatar_public_path(filename: str) -> str:
    return f"/storage/avatars/{filename}"


def remove_avatar_file(profile: Profile) -> None:
    if not profile.avatar_url:
        return
    filename = os.path.basename(profile.avatar_url)
    # Only touch files that look like local avatars (relative path under /storage/avatars/).
    if filename and filename != profile.avatar_url:
        path = os.path.join(AVATAR_DIR, filename)
        if os.path.isfile(path):
            os.remove(path)


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
    if file.size and file.size > MAX_AVATAR_SIZE:
        raise HTTPException(status_code=400, detail="File too large (max 5MB)")
    if not file.filename or "." not in file.filename:
        raise HTTPException(status_code=400, detail="Invalid file name")

    ext = file.filename.rsplit(".", 1)[-1].lower()
    if ext not in ALLOWED_AVATAR_EXTS:
        raise HTTPException(status_code=400, detail=f"Unsupported file type: {ext}")

    content = await file.read()
    if not content:
        raise HTTPException(status_code=400, detail="Empty file")
    if len(content) > MAX_AVATAR_SIZE:
        raise HTTPException(status_code=400, detail="File too large (max 5MB)")

    filename = f"{uuid.uuid4().hex}.{ext}"
    with open(os.path.join(AVATAR_DIR, filename), "wb") as f:
        f.write(content)

    remove_avatar_file(current_user)
    current_user.avatar_url = avatar_public_path(filename)
    await db.flush()
    await db.refresh(current_user)
    return AvatarUploadResponse(url=current_user.avatar_url)


@router.delete("/avatar", response_model=ProfileResponse)
async def delete_avatar(
    current_user: Profile = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    remove_avatar_file(current_user)
    current_user.avatar_url = None
    await db.flush()
    await db.refresh(current_user)
    return current_user