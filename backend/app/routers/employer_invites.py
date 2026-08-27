"""
Router for Employer Team Member Invites
"""
import uuid
from datetime import datetime, timedelta
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, EmailStr
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.database import get_db
from app.middleware.auth import get_current_user
from app.models import Profile, EmployerInvite
from app.services.email import send_raw_email

router = APIRouter(prefix="/api/v1/employers/invites", tags=["employer_invites"])


class CreateInviteRequest(BaseModel):
    email: EmailStr
    role: Optional[str] = "employer_member"


class EmployerInviteResponse(BaseModel):
    id: str
    employer_id: str
    company_name: str
    email: str
    role: str
    invite_token: str
    status: str
    created_at: datetime
    expires_at: datetime


@router.post("", response_model=EmployerInviteResponse, status_code=status.HTTP_201_CREATED)
async def create_team_invite(
    payload: CreateInviteRequest,
    current_user: Profile = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Invite a new team member to employer organization."""
    if current_user.role not in ("employer", "admin"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only employer or admin accounts can invite team members.",
        )

    company_name = current_user.company_name or "Company"
    token = uuid.uuid4().hex
    expires_at = datetime.utcnow() + timedelta(hours=48)

    invite = EmployerInvite(
        employer_id=current_user.id,
        company_name=company_name,
        email=payload.email,
        role=payload.role or "employer_member",
        invite_token=token,
        status="pending",
        expires_at=expires_at,
    )
    db.add(invite)
    await db.commit()
    await db.refresh(invite)

    # Send invitation email
    invite_url = f"{current_user.company_name or 'Synapse'} team invite link: /register/employer?token={token}"
    body = (
        f"Hello,\n\n"
        f"You have been invited by {current_user.full_name} to join {company_name} on Synapse.\n"
        f"Click the link to accept: {invite_url}\n\n"
        f"This invite expires in 48 hours."
    )
    send_raw_email(payload.email, f"Invitation to join {company_name} on Synapse", f"<p>{body}</p>", body)

    return EmployerInviteResponse(
        id=str(invite.id),
        employer_id=str(invite.employer_id),
        company_name=invite.company_name,
        email=invite.email,
        role=invite.role,
        invite_token=invite.invite_token,
        status=invite.status,
        created_at=invite.created_at,
        expires_at=invite.expires_at,
    )


@router.get("", response_model=List[EmployerInviteResponse])
async def list_team_invites(
    current_user: Profile = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """List team invites for current employer."""
    if current_user.role not in ("employer", "admin"):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Employer access required.")

    result = await db.execute(
        select(EmployerInvite)
        .where(EmployerInvite.employer_id == current_user.id)
        .order_by(EmployerInvite.created_at.desc())
    )
    invites = result.scalars().all()
    return [
        EmployerInviteResponse(
            id=str(inv.id),
            employer_id=str(inv.employer_id),
            company_name=inv.company_name,
            email=inv.email,
            role=inv.role,
            invite_token=inv.invite_token,
            status=inv.status,
            created_at=inv.created_at,
            expires_at=inv.expires_at,
        )
        for inv in invites
    ]


@router.delete("/{invite_id}")
async def revoke_team_invite(
    invite_id: str,
    current_user: Profile = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Revoke an active team invite."""
    result = await db.execute(
        select(EmployerInvite).where(
            EmployerInvite.id == invite_id,
            EmployerInvite.employer_id == current_user.id,
        )
    )
    invite = result.scalar_one_or_none()
    if not invite:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Invite not found.")

    invite.status = "revoked"
    await db.commit()
    return {"message": "Invite revoked successfully."}
