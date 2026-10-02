from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
from uuid import UUID


class ReferralInviteRequest(BaseModel):
    referee_email: Optional[str] = None


class ReferralClaimRequest(BaseModel):
    referral_code: str


class ReferralResponse(BaseModel):
    id: UUID
    referral_code: str
    referee_email: Optional[str] = None
    status: str
    reward_points: int
    created_at: datetime
    claimed_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class ReferralStatsResponse(BaseModel):
    referral_code: str
    referral_link: str
    total_invites: int
    successful_referrals: int
    total_rewards_earned: int
    referrals: List[ReferralResponse]
