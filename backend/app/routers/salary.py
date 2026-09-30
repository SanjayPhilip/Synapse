from fastapi import APIRouter, Depends
from app.schemas.salary import SalaryNegotiationRequest, SalaryNegotiationResponse
from app.services.salary import generate_negotiation_strategy
from app.middleware.auth import get_current_user
from app.models import Profile

router = APIRouter(prefix="/api/v1/salary", tags=["salary"])


@router.post("/negotiate", response_model=SalaryNegotiationResponse)
async def get_salary_negotiation_advice(
    data: SalaryNegotiationRequest,
    current_user: Profile = Depends(get_current_user),
):
    """Generate market compensation benchmarks, counter-offer strategy, and scripts."""
    return await generate_negotiation_strategy(
        job_title=data.job_title,
        offered_salary=data.offered_salary,
        target_salary=data.target_salary,
        location=data.location,
        experience_level=data.experience_level,
        currency=data.currency,
    )
