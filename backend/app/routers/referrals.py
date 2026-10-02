import secrets
import uuid
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from app.database import get_db
from app.models import Referral, Profile
from app.schemas.referral import ReferralInviteRequest, ReferralClaimRequest, ReferralResponse, ReferralStatsResponse
from app.middleware.auth import get_current_user

router = APIRouter(prefix="/api/v1/referrals", tags=["referrals"])


def _generate_referral_code(user_id: uuid.UUID) -> str:
    return f"SYN-{str(user_id)[:4].upper()}-{secrets.token_hex(2).upper()}"


@router.get("/stats", response_model=ReferralStatsResponse)
async def get_referral_stats(
    current_user: Profile = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    # Find existing referral code or create initial referral record
    res = await db.execute(
        select(Referral).where(Referral.referrer_id == current_user.id).order_by(Referral.created_at.asc())
    )
    referrals = res.scalars().all()
    
    if referrals:
        code = referrals[0].referral_code
    else:
        code = _generate_referral_code(current_user.id)
        # Create initial placeholder referral code
        init_ref = Referral(
            referrer_id=current_user.id,
            referral_code=code,
            status="pending",
        )
        db.add(init_ref)
        await db.flush()
        referrals = [init_ref]

    successful = [r for r in referrals if r.status in ("joined", "rewarded") and r.referee_id is not None]
    total_points = sum(r.reward_points for r in successful)
    
    # Filter out empty placeholder for display list if it has no referee
    active_list = [r for r in referrals if r.referee_email or r.referee_id]
    
    return ReferralStatsResponse(
        referral_code=code,
        referral_link=f"/register?ref={code}",
        total_invites=len(active_list),
        successful_referrals=len(successful),
        total_rewards_earned=total_points,
        referrals=[ReferralResponse.model_validate(r) for r in active_list],
    )


@router.post("/invite", response_model=ReferralResponse)
async def invite_friend(
    data: ReferralInviteRequest,
    current_user: Profile = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    # Get user's referral code
    res = await db.execute(
        select(Referral).where(Referral.referrer_id == current_user.id).order_by(Referral.created_at.asc())
    )
    first_ref = res.scalars().first()
    code = first_ref.referral_code if first_ref else _generate_referral_code(current_user.id)

    new_ref = Referral(
        referrer_id=current_user.id,
        referral_code=code,
        referee_email=data.referee_email,
        status="pending",
    )
    db.add(new_ref)
    await db.flush()
    await db.refresh(new_ref)
    return ReferralResponse.model_validate(new_ref)


@router.post("/claim")
async def claim_referral(
    data: ReferralClaimRequest,
    current_user: Profile = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    code = data.referral_code.strip()
    res = await db.execute(
        select(Referral).where(Referral.referral_code == code)
    )
    ref = res.scalars().first()
    if not ref:
        raise HTTPException(status_code=404, detail="Invalid referral code")
    if ref.referrer_id == current_user.id:
        raise HTTPException(status_code=400, detail="Cannot claim your own referral code")

    # Check if already claimed by this user
    already = await db.execute(
        select(Referral).where(Referral.referee_id == current_user.id)
    )
    if already.scalars().first():
        return {"message": "Referral already claimed previously", "reward_points": 0}

    claim_record = Referral(
        referrer_id=ref.referrer_id,
        referral_code=code,
        referee_id=current_user.id,
        referee_email=current_user.email,
        status="rewarded",
        reward_points=100,
        claimed_at=datetime.utcnow(),
    )
    db.add(claim_record)
    await db.flush()
    return {"message": "Referral reward claimed successfully!", "reward_points": 100}
