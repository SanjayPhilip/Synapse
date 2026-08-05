from datetime import datetime, timedelta
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from jose import JWTError, jwt
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import get_settings
from app.database import get_db
from app.middleware.auth import (
    create_access_token,
    get_current_session,
    get_current_user,
    verify_password,
)
from app.middleware.rate_limit import rate_limiter
from app.models import Profile, SessionToken
from app.schemas.security import (
    DeleteAccountRequest,
    EmailChangeConfirm,
    EmailChangeRequest,
    SessionTokenResponse,
)
from app.services.email import send_email_change_verification

router = APIRouter(prefix="/api/v1/security", tags=["security"])


async def _revoke_all_sessions(db: AsyncSession, user_id: UUID) -> None:
    """Revoke every non-revoked session belonging to the user."""
    await db.execute(
        update(SessionToken)
        .where(
            SessionToken.user_id == user_id,
            SessionToken.revoked_at.is_(None),
        )
        .values(revoked_at=datetime.utcnow())
    )


@router.get("/sessions", response_model=list[SessionTokenResponse])
async def list_sessions(
    current_user: Profile = Depends(get_current_user),
    current_session: SessionToken = Depends(get_current_session),
    db: AsyncSession = Depends(get_db),
):
    """List active sessions for the current user, flagging the current one."""
    result = await db.execute(
        select(SessionToken)
        .where(
            SessionToken.user_id == current_user.id,
            SessionToken.revoked_at.is_(None),
        )
        .order_by(SessionToken.created_at.desc())
    )
    sessions = result.scalars().all()
    return [
        SessionTokenResponse(
            id=s.id,
            user_agent=s.user_agent,
            ip_address=s.ip_address,
            created_at=s.created_at,
            last_used_at=s.last_used_at,
            expires_at=s.expires_at,
            is_current=(s.id == current_session.id),
        )
        for s in sessions
    ]


@router.delete("/sessions/{session_id}")
async def revoke_session(
    session_id: UUID,
    current_user: Profile = Depends(get_current_user),
    current_session: SessionToken = Depends(get_current_session),
    db: AsyncSession = Depends(get_db),
):
    """Revoke a specific session belonging to the current user."""
    result = await db.execute(
        select(SessionToken).where(
            SessionToken.id == session_id,
            SessionToken.user_id == current_user.id,
            SessionToken.revoked_at.is_(None),
        )
    )
    session = result.scalar_one_or_none()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    session.revoked_at = datetime.utcnow()
    await db.flush()
    return {"message": "Session revoked"}


@router.delete("/sessions")
async def revoke_other_sessions(
    current_user: Profile = Depends(get_current_user),
    current_session: SessionToken = Depends(get_current_session),
    db: AsyncSession = Depends(get_db),
):
    """Revoke all sessions except the current one."""
    await db.execute(
        update(SessionToken)
        .where(
            SessionToken.user_id == current_user.id,
            SessionToken.id != current_session.id,
            SessionToken.revoked_at.is_(None),
        )
        .values(revoked_at=datetime.utcnow())
    )
    await db.flush()
    return {"message": "All other sessions revoked"}


@router.post("/email/change")
async def request_email_change(
    data: EmailChangeRequest,
    current_user: Profile = Depends(get_current_user),
    current_session: SessionToken = Depends(get_current_session),
    db: AsyncSession = Depends(get_db),
    _: None = Depends(rate_limiter(5, 60)),
):
    """Send a verification link to the new email address."""
    new_email = data.new_email.lower()
    if new_email == current_user.email.lower():
        raise HTTPException(status_code=400, detail="New email is the same as the current email")

    result = await db.execute(select(Profile).where(Profile.email == new_email))
    if result.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Email already registered")

    change_token = create_access_token(
        {"sub": str(current_user.id), "purpose": "email_change", "new_email": new_email},
        expires_delta=timedelta(minutes=30),
    )
    verify_url = f"{get_settings().APP_BASE_URL}/security/confirm-email-change?token={change_token}"
    send_email_change_verification(new_email, verify_url)
    return {"message": "Verification email sent to the new address.", "token": change_token}


@router.post("/email/confirm")
async def confirm_email_change(
    data: EmailChangeConfirm,
    db: AsyncSession = Depends(get_db),
    _: None = Depends(rate_limiter(10, 60)),
):
    """Confirm the email change with the token from the verification link."""
    try:
        payload = jwt.decode(data.token, get_settings().SECRET_KEY, algorithms=[get_settings().ALGORITHM])
    except JWTError:
        raise HTTPException(status_code=400, detail="Invalid or expired token")

    if payload.get("purpose") != "email_change" or not payload.get("sub") or not payload.get("new_email"):
        raise HTTPException(status_code=400, detail="Invalid email change token")

    user_id = payload["sub"]
    new_email = payload["new_email"]

    result = await db.execute(select(Profile).where(Profile.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="Account not found")

    taken = await db.execute(select(Profile).where(Profile.email == new_email))
    if taken.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Email already registered")

    user.email = new_email
    user.is_verified = True
    await _revoke_all_sessions(db, user.id)
    await db.flush()
    return {"message": "Email updated successfully. All sessions have been revoked."}


@router.post("/delete-account")
async def delete_account(
    data: DeleteAccountRequest,
    current_user: Profile = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    _: None = Depends(rate_limiter(5, 60)),
):
    """Soft-delete the account after password verification."""
    if not data.confirm:
        raise HTTPException(status_code=400, detail="Confirmation flag must be true")
    if not verify_password(data.password, current_user.password_hash):
        raise HTTPException(status_code=400, detail="Current password is incorrect")

    current_user.is_active = False
    current_user.is_deleted = True
    await _revoke_all_sessions(db, current_user.id)
    await db.flush()
    return {"message": "Account deactivated successfully"}
