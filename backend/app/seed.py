"""
Seed the database with sample job postings.
Usage: python -m app.seed
"""
import asyncio
import uuid
from app.database import engine, async_session
from app.models import Profile, JobPosting
from app.middleware.auth import hash_password


SAMPLE_JOBS = [
    {
        "title": "Senior React Developer",
        "description": "We are looking for a Senior React Developer to join our frontend team. You will build and maintain high-performance web applications using React, TypeScript, and modern frontend tools.",
        "requirements": ["React", "TypeScript", "JavaScript", "HTML", "CSS", "REST APIs", "Git"],
        "responsibilities": ["Build responsive web applications", "Code review", "Mentor junior developers"],
        "location": "San Francisco, CA",
        "is_remote": True,
        "salary_min": 120000,
        "salary_max": 180000,
        "job_type": "full_time",
        "category": "Software Engineering",
    },
    {
        "title": "Python Backend Engineer",
        "description": "Join our backend team to build scalable APIs and microservices using Python, FastAPI, and PostgreSQL. Experience with cloud platforms preferred.",
        "requirements": ["Python", "FastAPI", "PostgreSQL", "REST APIs", "Docker", "AWS"],
        "responsibilities": ["Design and implement APIs", "Database optimization", "Write tests"],
        "location": "New York, NY",
        "is_remote": True,
        "salary_min": 110000,
        "salary_max": 160000,
        "job_type": "full_time",
        "category": "Software Engineering",
    },
    {
        "title": "Machine Learning Engineer",
        "description": "Build and deploy ML models for NLP and recommendation systems. Work with large datasets and production ML pipelines.",
        "requirements": ["Python", "TensorFlow", "PyTorch", "Scikit-learn", "SQL", "Docker", "AWS"],
        "responsibilities": ["Train and evaluate models", "Deploy models to production", "Data pipeline development"],
        "location": "Seattle, WA",
        "is_remote": False,
        "salary_min": 130000,
        "salary_max": 200000,
        "job_type": "full_time",
        "category": "Data Science & AI",
    },
    {
        "title": "Data Analyst & Business Intelligence",
        "description": "Analyze complex business datasets, design interactive Tableau/PowerBI dashboards, and deliver actionable data analytics to executive leadership.",
        "requirements": ["SQL", "Python", "Tableau", "Power BI", "Data Analysis", "Statistics", "Excel"],
        "responsibilities": ["Create executive reports", "Analyze customer retention trends", "Present data-driven findings"],
        "location": "Chicago, IL",
        "is_remote": True,
        "salary_min": 85000,
        "salary_max": 125000,
        "job_type": "full_time",
        "category": "Data Analytics",
    },
    {
        "title": "Business Strategy Consultant (MBA)",
        "description": "Drive corporate strategy, market expansion, and business transformation initiatives. Required MBA degree with strong strategic planning and leadership experience.",
        "requirements": ["MBA", "Business Strategy", "Financial Modeling", "Stakeholder Management", "Market Research", "Project Management"],
        "responsibilities": ["Lead strategic consulting projects", "Develop corporate growth roadmaps", "Brief senior executives"],
        "location": "New York, NY",
        "is_remote": False,
        "salary_min": 135000,
        "salary_max": 190000,
        "job_type": "full_time",
        "category": "Business & MBA",
    },
    {
        "title": "Senior Business Analyst",
        "description": "Bridge technology and business operational needs. Gather requirements, map process workflows, and evaluate business metrics for digital transformation.",
        "requirements": ["Business Analysis", "Requirement Gathering", "Agile/Scrum", "JIRA", "SQL", "Communication"],
        "responsibilities": ["Translate business needs to dev specs", "Facilitate stakeholder workshops", "Oversee UAT testing"],
        "location": "Boston, MA",
        "is_remote": True,
        "salary_min": 95000,
        "salary_max": 140000,
        "job_type": "full_time",
        "category": "Business & MBA",
    },
    {
        "title": "DevOps Engineer",
        "description": "Manage and improve our CI/CD pipelines, cloud infrastructure, and monitoring systems.",
        "requirements": ["Docker", "Kubernetes", "AWS", "CI/CD", "Terraform", "Linux", "Python"],
        "responsibilities": ["Maintain infrastructure", "Automate deployments", "Monitor system health"],
        "location": "Denver, CO",
        "is_remote": True,
        "salary_min": 100000,
        "salary_max": 150000,
        "job_type": "full_time",
        "category": "Cloud & DevOps",
    },
    {
        "title": "Financial & Risk Analyst",
        "description": "Perform quantitative financial analysis, portfolio valuation, and risk assessment for corporate investment decisions.",
        "requirements": ["Financial Modeling", "Corporate Finance", "Excel VBA", "SQL", "Bloomberg Terminal", "Accounting"],
        "responsibilities": ["Prepare financial forecasts", "Evaluate investment opportunities", "Monitor portfolio risk"],
        "location": "New York, NY",
        "is_remote": False,
        "salary_min": 90000,
        "salary_max": 130000,
        "job_type": "full_time",
        "category": "Finance & Accounting",
    },
    {
        "title": "Growth Marketing Manager",
        "description": "Develop and execute multi-channel digital marketing campaigns, performance analytics, SEO/SEM strategies, and customer acquisition funnels.",
        "requirements": ["Digital Marketing", "SEO/SEM", "Google Analytics", "Growth Hacking", "Content Strategy", "A/B Testing"],
        "responsibilities": ["Manage acquisition budgets", "Optimize conversion funnels", "Track marketing ROI"],
        "location": "Austin, TX",
        "is_remote": True,
        "salary_min": 85000,
        "salary_max": 120000,
        "job_type": "full_time",
        "category": "Marketing & Sales",
    },
]


async def seed():
    async with async_session() as session:
        # 1. Employer Account
        result = await session.execute(select(Profile).where(Profile.email == "employer@synapse.demo"))
        employer = result.scalars().first()
        
        if not employer:
            employer = Profile(
                id=uuid.uuid4(),
                email="employer@synapse.demo",
                full_name="Demo Employer",
                role="employer",
                company_name="TechCorp Inc.",
                password_hash=hash_password("Demo1234!"),
            )
            session.add(employer)
            await session.flush()

            for job_data in SAMPLE_JOBS:
                job = JobPosting(
                    employer_id=employer.id,
                    status="active",
                    **job_data,
                )
                session.add(job)
            print(f"Seeded employer (employer@synapse.demo / Demo1234!) with {len(SAMPLE_JOBS)} jobs.")
        else:
            print("Employer (employer@synapse.demo) already exists in database.")

        # 2. Seeker Account
        result_seeker = await session.execute(select(Profile).where(Profile.email == "seeker@synapse.demo"))
        seeker = result_seeker.scalars().first()

        if not seeker:
            seeker = Profile(
                id=uuid.uuid4(),
                email="seeker@synapse.demo",
                full_name="Demo Candidate",
                role="seeker",
                password_hash=hash_password("Demo1234!"),
            )
            session.add(seeker)
            await session.flush()
            print("Seeded seeker (seeker@synapse.demo / Demo1234!).")

        # 3. Admin Account
        result_admin = await session.execute(select(Profile).where(Profile.email == "admin@synapse.demo"))
        admin = result_admin.scalars().first()

        if not admin:
            admin = Profile(
                id=uuid.uuid4(),
                email="admin@synapse.demo",
                full_name="System Administrator",
                role="admin",
                company_name="Synapse Governance",
                password_hash=hash_password("Demo1234!"),
            )
            session.add(admin)
            await session.flush()
            print("Seeded admin (admin@synapse.demo / Demo1234!).")

        await session.commit()


if __name__ == "__main__":
    from sqlalchemy import select
    asyncio.run(seed())
