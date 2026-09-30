from typing import Optional
from app.config import get_settings
from app.schemas.salary import SalaryNegotiationResponse, NegotiationScript

ROLE_BASE_SALARIES = {
    "software": 115000,
    "engineer": 115000,
    "developer": 110000,
    "frontend": 105000,
    "backend": 120000,
    "full stack": 115000,
    "data science": 125000,
    "data analyst": 85000,
    "machine learning": 135000,
    "ai": 135000,
    "devops": 125000,
    "cloud": 125000,
    "product manager": 120000,
    "product designer": 105000,
    "ui/ux": 95000,
    "qa": 85000,
    "security": 130000,
    "marketing": 75000,
    "sales": 80000,
    "finance": 90000,
    "hr": 70000,
}

EXPERIENCE_MULTIPLIERS = {
    "entry": 0.75,
    "junior": 0.80,
    "mid": 1.0,
    "mid-level": 1.0,
    "senior": 1.35,
    "lead": 1.60,
    "staff": 1.75,
    "principal": 1.90,
}

LOCATION_MULTIPLIERS = {
    "san francisco": 1.25,
    "new york": 1.25,
    "nyc": 1.25,
    "seattle": 1.15,
    "boston": 1.12,
    "austin": 1.05,
    "los angeles": 1.15,
    "chicago": 1.05,
    "remote": 1.05,
}


def calculate_salary_benchmarks(
    job_title: str,
    experience_level: Optional[str] = "Mid-Level",
    location: Optional[str] = "Remote",
) -> tuple[float, float, float]:
    title_lower = job_title.lower()
    base_salary = 100000.0  # default national benchmark

    for keyword, salary in ROLE_BASE_SALARIES.items():
        if keyword in title_lower:
            base_salary = float(salary)
            break

    exp_key = (experience_level or "mid").lower()
    exp_mult = 1.0
    for k, mult in EXPERIENCE_MULTIPLIERS.items():
        if k in exp_key:
            exp_mult = mult
            break

    loc_key = (location or "remote").lower()
    loc_mult = 1.0
    for k, mult in LOCATION_MULTIPLIERS.items():
        if k in loc_key:
            loc_mult = mult
            break

    midpoint = round(base_salary * exp_mult * loc_mult, -2)
    b_min = round(midpoint * 0.85, -2)
    b_max = round(midpoint * 1.25, -2)
    return b_min, midpoint, b_max


async def generate_negotiation_strategy(
    job_title: str,
    offered_salary: Optional[float] = None,
    target_salary: Optional[float] = None,
    location: Optional[str] = "Remote",
    experience_level: Optional[str] = "Mid-Level",
    currency: Optional[str] = "USD",
) -> SalaryNegotiationResponse:
    b_min, b_mid, b_max = calculate_salary_benchmarks(job_title, experience_level, location)

    curr = currency or "USD"
    curr_symbol = "$" if curr == "USD" else f"{curr} "

    if offered_salary and offered_salary > 0:
        if offered_salary < b_mid:
            # Under market median: counter towards 75th percentile
            recommended_counter = round(min(b_max, max(offered_salary * 1.15, b_mid)), -2)
        else:
            # At or above median: counter 8-12% higher
            recommended_counter = round(min(b_max, offered_salary * 1.10), -2)
        counter_pct = round(((recommended_counter - offered_salary) / offered_salary) * 100, 1)
    elif target_salary and target_salary > 0:
        recommended_counter = float(target_salary)
        counter_pct = 0.0
    else:
        recommended_counter = round(b_mid * 1.08, -2)
        counter_pct = 8.0

    offered_str = f"{curr_symbol}{offered_salary:,.0f}" if offered_salary else "the initial offer"
    counter_str = f"{curr_symbol}{recommended_counter:,.0f}"
    b_mid_str = f"{curr_symbol}{b_mid:,.0f}"

    strategy_summary = (
        f"Based on current market compensation data for {experience_level} {job_title} roles in {location}, "
        f"the median benchmark is {b_mid_str}. We recommend countering at {counter_str} "
        f"({counter_pct:+.1f}% adjustment), supported by your specialized technical contributions."
    )

    leverage_points = [
        f"Competitive market median for {experience_level} {job_title} in {location} sits at {b_mid_str}.",
        "Impact velocity: Highlight faster onboarding and immediate domain execution to justify upper-bracket pay.",
        "Alternative value trades: If the base salary budget is constrained, request a sign-on bonus, equity top-up, or 6-month performance review.",
        "Total compensation structure: Factor in health benefits, 401(k)/retirement matching, and remote home office stipend.",
    ]

    scripts = [
        NegotiationScript(
            title="Standard Professional Counter-Offer",
            scenario="Best used when the initial offer is slightly below your target and you want to maintain high enthusiasm.",
            body=(
                f"Dear [Hiring Manager / Recruiter Name],\n\n"
                f"Thank you so much for extending the offer to join [Company Name] as {job_title}! "
                f"I am genuinely thrilled about the opportunity to contribute to the team's upcoming initiatives.\n\n"
                f"After carefully reviewing the details of the offer and considering current market benchmarks for this role in {location}, "
                f"I would like to discuss the base salary. Given my background and the immediate impact I plan to deliver, "
                f"I would be delighted to accept immediately if we can align the base compensation closer to {counter_str}.\n\n"
                f"I am very excited about this role and confident we can find a mutually agreeable package. "
                f"I look forward to discussing this further!\n\n"
                f"Warm regards,\n[Your Name]"
            ),
        ),
        NegotiationScript(
            title="Total Rewards & Flexibility Trade-off",
            scenario="Use when base salary is fixed by corporate bands, but you want to negotiate signing bonus, equity, or PTO.",
            body=(
                f"Dear [Hiring Manager / Recruiter Name],\n\n"
                f"Thank you for the formal offer for the {job_title} role at [Company Name]. I remain very enthusiastic about the work ahead.\n\n"
                f"I understand that internal base compensation bands may have constraints. If {counter_str} is outside the current base limit, "
                f"would there be flexibility to bridge the difference through a one-time signing bonus of {curr_symbol}{round(recommended_counter * 0.08, -2):,.0f}, "
                f"additional equity grants, or a formal compensation review at the 6-month mark?\n\n"
                f"Finding a strong total compensation structure that reflects the scope of this position is my main goal, "
                f"and I am eager to finalize details.\n\n"
                f"Best regards,\n[Your Name]"
            ),
        ),
        NegotiationScript(
            title="Competing Opportunities / Market Reality",
            scenario="Use when you have competing interviews or active offers giving you strong market leverage.",
            body=(
                f"Dear [Hiring Manager / Recruiter Name],\n\n"
                f"Thank you again for the offer for the {job_title} position. [Company Name] remains my top choice because of the mission and team culture.\n\n"
                f"As I evaluate my current options and market discussions, other opportunities for similar scope are offering compensation in the "
                f"{counter_str} range. Because I strongly prefer to join [Company Name], I would be ready to decline other conversations if we can close the gap to {counter_str}.\n\n"
                f"Please let me know if this adjustment is possible. Thank you again for your time and advocacy!\n\n"
                f"Sincerely,\n[Your Name]"
            ),
        ),
    ]

    tactical_tips = [
        "Never negotiate against yourself: Wait for their official reply before making concessions.",
        "Always express genuine enthusiasm for the role before bringing up numbers.",
        "Anchor on value: Connect your counter-offer directly to key problems you will solve in your first 90 days.",
        "Get agreement in writing: Once verbal terms are agreed upon, request an updated formal written offer letter.",
    ]

    return SalaryNegotiationResponse(
        job_title=job_title,
        currency=curr,
        offered_salary=offered_salary,
        benchmark_min=b_min,
        benchmark_mid=b_mid,
        benchmark_max=b_max,
        recommended_counter=recommended_counter,
        recommended_counter_percentage=counter_pct,
        strategy_summary=strategy_summary,
        leverage_points=leverage_points,
        scripts=scripts,
        tactical_tips=tactical_tips,
    )
