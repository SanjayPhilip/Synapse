from pydantic import BaseModel
from typing import Optional, List


class NegotiationScript(BaseModel):
    title: str
    scenario: str
    body: str


class SalaryNegotiationRequest(BaseModel):
    job_title: str
    offered_salary: Optional[float] = None
    target_salary: Optional[float] = None
    location: Optional[str] = "Remote"
    experience_level: Optional[str] = "Mid-Level"
    currency: Optional[str] = "USD"


class SalaryNegotiationResponse(BaseModel):
    job_title: str
    currency: str
    offered_salary: Optional[float] = None
    benchmark_min: float
    benchmark_mid: float
    benchmark_max: float
    recommended_counter: float
    recommended_counter_percentage: float
    strategy_summary: str
    leverage_points: List[str]
    scripts: List[NegotiationScript]
    tactical_tips: List[str]
