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
        # Clear existing data for clean re-seed
        from app.models import MatchScore, Application, SavedJob, Notification, Resume, CandidateNote, CompanyProfile
        await session.execute(delete(MatchScore))
        await session.execute(delete(CandidateNote))
        await session.execute(delete(Application))
        await session.execute(delete(SavedJob))
        await session.execute(delete(Notification))
        await session.execute(delete(Resume))
        await session.execute(delete(JobPosting))
        await session.execute(delete(CompanyProfile))
        await session.execute(delete(Profile))
        await session.commit()

        # 1. Primary Employer Account
        employer = Profile(
            id=uuid.uuid4(),
            email="employer@synapse.demo",
            full_name="Sarah Jenkins",
            role="employer",
            company_name="TechCorp Inc.",
            headline="VP of Engineering & Talent Lead",
            location="San Francisco, CA",
            password_hash=hash_password("Demo1234!"),
        )
        session.add(employer)
        await session.flush()

        # Company Profile
        company_prof = CompanyProfile(
            employer_id=employer.id,
            company_name="TechCorp Inc.",
            slug="techcorp-inc",
            tagline="Building the next generation of cloud-native AI infrastructure.",
            overview="TechCorp Inc. is a leading enterprise cloud provider powering millions of developer workflows globally.",
            industry="Software & Cloud Infrastructure",
            company_size="500-1000 employees",
            headquarters="San Francisco, CA",
            website="https://techcorp.example.com",
            perks=["Flexible Remote", "Unlimited PTO", "$3,000 Learning Stipend", "Full Health & Dental"],
            culture=["Innovation first", "Transparent communication", "Continuous growth"],
        )
        session.add(company_prof)

        # Create Job Postings
        job_instances = []
        for job_data in SAMPLE_JOBS:
            job = JobPosting(
                employer_id=employer.id,
                status="active",
                auto_screening_enabled=True,
                auto_approve_threshold=85,
                auto_reject_threshold=50,
                **job_data,
            )
            session.add(job)
            job_instances.append(job)
        await session.flush()

        # 2. Primary Seeker Account
        seeker = Profile(
            id=uuid.uuid4(),
            email="seeker@synapse.demo",
            full_name="Alex Rivera",
            role="seeker",
            headline="Full-Stack Engineer & AI Enthusiast",
            bio="Software engineer with 5+ years of experience building modern React, TypeScript, and Python web applications.",
            location="San Francisco, CA",
            phone="+1 (555) 234-5678",
            linkedin="https://linkedin.com/in/alex-rivera-demo",
            website="https://alexrivera.dev",
            password_hash=hash_password("Demo1234!"),
        )
        session.add(seeker)
        await session.flush()

        # Seeker Resumes
        seeker_resume_1 = Resume(
            user_id=seeker.id,
            file_name="Alex_Rivera_FullStack_Resume.pdf",
            file_type="application/pdf",
            is_current=True,
            version=1,
            skills=["React", "TypeScript", "JavaScript", "Python", "FastAPI", "PostgreSQL", "Docker", "REST APIs", "Git", "Tailwind CSS"],
            raw_text="Alex Rivera - Full Stack Developer. Experienced with React, TypeScript, Node.js, Python, FastAPI, SQL, PostgreSQL, Docker, AWS, microservices, REST APIs, responsive UI design, CI/CD pipelines.",
            parsed_data={
                "summary": "Full Stack Developer with 5+ years experience building web applications.",
                "skills": ["React", "TypeScript", "JavaScript", "Python", "FastAPI", "PostgreSQL", "Docker", "REST APIs", "Git"],
                "experience": [
                    {
                        "company": "Nexus Solutions",
                        "title": "Senior Frontend Developer",
                        "dates": "2022 - Present",
                        "bullets": [
                            "Architected React & TypeScript web frontend serving 50,000+ daily active users.",
                            "Optimized web app performance reducing page load times by 42%.",
                            "Collaborated with backend engineers to integrate REST & GraphQL APIs."
                        ]
                    },
                    {
                        "company": "CloudWave Systems",
                        "title": "Software Engineer",
                        "dates": "2020 - 2022",
                        "bullets": [
                            "Developed backend services using Python and FastAPI.",
                            "Maintained PostgreSQL databases and wrote complex analytical queries."
                        ]
                    }
                ],
                "education": [{"degree": "B.S. in Computer Science", "school": "University of California, Berkeley", "year": "2020"}]
            }
        )
        session.add(seeker_resume_1)

        # Additional Demo Candidates (for Employer Portal viewing & analytics)
        candidate_specs = [
            {
                "full_name": "Marcus Vance",
                "email": "marcus.vance@example.com",
                "headline": "Senior React & Frontend Architect",
                "skills": ["React", "TypeScript", "JavaScript", "HTML", "CSS", "REST APIs", "Git", "Next.js", "Redux"],
                "resume_text": "Senior React Developer with 7 years of frontend experience. Master of React, TypeScript, Next.js, Webpack, Tailwind, state management, performance audit, unit testing with Jest.",
                "target_job_idx": 0, # React Dev
                "score": 94.5,
                "status": "interviewing",
                "interview_link": "https://meet.google.com/syn-int-marcus",
                "notes": "Outstanding technical assessment! Strong leadership capability."
            },
            {
                "full_name": "Elena Rostova",
                "email": "elena.rostova@example.com",
                "headline": "Python Backend & Cloud Architect",
                "skills": ["Python", "FastAPI", "PostgreSQL", "REST APIs", "Docker", "AWS", "Redis", "Kafka"],
                "resume_text": "Backend Systems Architect specializing in Python, FastAPI, AsyncIO, PostgreSQL database tuning, AWS Lambda, Docker containerization, Kubernetes and Redis caching.",
                "target_job_idx": 1, # Backend Engineer
                "score": 91.0,
                "status": "shortlisted",
                "interview_link": None,
                "notes": "Impressive background in high-throughput backend services."
            },
            {
                "full_name": "David Kim",
                "email": "david.kim@example.com",
                "headline": "Senior ML Engineer",
                "skills": ["Python", "TensorFlow", "PyTorch", "Scikit-learn", "SQL", "Docker", "AWS", "MLOps"],
                "resume_text": "Machine Learning Engineer with 6 years experience training Deep Learning models, NLP transformer pipelines, PyTorch, TensorFlow, MLOps, SageMaker and Docker deployment.",
                "target_job_idx": 2, # ML Engineer
                "score": 88.0,
                "status": "offered",
                "interview_link": "https://meet.google.com/syn-int-david",
                "notes": "Offer extended! Waiting for signature."
            },
            {
                "full_name": "Priya Sharma",
                "email": "priya.sharma@example.com",
                "headline": "Lead Business & BI Data Analyst",
                "skills": ["SQL", "Python", "Tableau", "Power BI", "Data Analysis", "Statistics", "Excel", "ETL"],
                "resume_text": "Business Intelligence Specialist with 5 years leading analytics teams. Deep expertise in SQL data modeling, Tableau dashboards, Power BI, Python pandas, statistical hypothesis testing.",
                "target_job_idx": 3, # Data Analyst
                "score": 92.5,
                "status": "applied",
                "interview_link": None,
                "notes": None
            },
            {
                "full_name": "Jordan Taylor",
                "email": "jordan.taylor@example.com",
                "headline": "Cloud DevOps & Platform Engineer",
                "skills": ["Docker", "Kubernetes", "AWS", "CI/CD", "Terraform", "Linux", "Python", "Helm"],
                "resume_text": "DevOps Engineer focused on infrastructure automation, Terraform, Kubernetes cluster management, AWS cloud security, Prometheus monitoring, GitHub Actions CI/CD pipelines.",
                "target_job_idx": 6, # DevOps
                "score": 86.5,
                "status": "reviewed",
                "interview_link": None,
                "notes": "Good profile. Reviewing certifications."
            }
        ]

        await session.flush()

        # Seed Applications, Match Scores, and Notifications directly for Primary Seeker (Alex Rivera)
        applications_data = [
            {
                "job": job_instances[0], # Senior React Dev
                "status": "interviewing",
                "score": 94.5,
                "interview_link": "https://meet.google.com/syn-int-alex-react",
                "notes": "Excellent live coding test! Technical interview scheduled for Thursday 2 PM PST.",
                "notification": ("Interview Scheduled!", "TechCorp Inc. scheduled a technical interview for 'Senior React Developer'.", "interview_scheduled")
            },
            {
                "job": job_instances[1], # Python Backend Eng
                "status": "shortlisted",
                "score": 91.0,
                "interview_link": None,
                "notes": "Shortlisted by hiring manager after reviewing FastAPI backend projects.",
                "notification": ("Application Shortlisted", "Your application for 'Python Backend Engineer' at TechCorp Inc. was shortlisted!", "status_change")
            },
            {
                "job": job_instances[2], # ML Engineer
                "status": "offered",
                "score": 88.0,
                "interview_link": "https://meet.google.com/syn-int-alex-offer",
                "notes": "Offer letter sent to candidate!",
                "notification": ("Job Offer Received!", "TechCorp Inc. extended a job offer for 'Machine Learning Engineer'.", "status_change")
            },
            {
                "job": job_instances[3], # Data Analyst
                "status": "applied",
                "score": 92.5,
                "interview_link": None,
                "notes": "Application pending initial screening.",
                "notification": None
            },
            {
                "job": job_instances[6], # DevOps Engineer
                "status": "reviewed",
                "score": 86.5,
                "interview_link": None,
                "notes": "Reviewed by DevOps team lead.",
                "notification": None
            },
        ]

        for app_info in applications_data:
            target_job = app_info["job"]
            
            # Application
            app = Application(
                seeker_id=seeker.id,
                job_posting_id=target_job.id,
                resume_id=seeker_resume_1.id,
                status=app_info["status"],
                match_score=app_info["score"],
                applied_via="platform",
                interview_link=app_info["interview_link"],
                employer_notes=app_info["notes"],
            )
            session.add(app)
            await session.flush()

            # Employer candidate notes
            if app_info["notes"]:
                note = CandidateNote(
                    application_id=app.id,
                    author_id=employer.id,
                    note_text=app_info["notes"]
                )
                session.add(note)

            # Match Score
            match_score = MatchScore(
                resume_id=seeker_resume_1.id,
                job_posting_id=target_job.id,
                direction="seeker_to_job",
                overall_score=app_info["score"],
                keyword_score=app_info["score"] + 1.0,
                semantic_score=app_info["score"] - 1.0,
                gap_report={
                    "matching_skills": ["React", "TypeScript", "Python", "FastAPI", "PostgreSQL", "Docker", "REST APIs", "Git"],
                    "missing_skills": [],
                    "recommendations": ["Highlight system architecture experience in technical interviews."]
                }
            )
            session.add(match_score)

            # Notification for Seeker
            if app_info["notification"]:
                title, msg, n_type = app_info["notification"]
                notif = Notification(
                    user_id=seeker.id,
                    title=title,
                    message=msg,
                    notification_type=n_type,
                    link="/applications",
                    is_read=False,
                )
                session.add(notif)

        # Saved Jobs for Seeker
        saved_1 = SavedJob(
            seeker_id=seeker.id,
            job_posting_id=job_instances[4].id, # Business Strategy
            match_score_at_save=84.0
        )
        saved_2 = SavedJob(
            seeker_id=seeker.id,
            job_posting_id=job_instances[5].id, # Senior Business Analyst
            match_score_at_save=89.0
        )
        session.add_all([saved_1, saved_2])

        # 3. Admin Account
        admin = Profile(
            id=uuid.uuid4(),
            email="admin@synapse.demo",
            full_name="System Administrator",
            role="admin",
            company_name="Synapse Governance",
            password_hash=hash_password("Demo1234!"),
        )
        session.add(admin)

        await session.commit()
        print("Database cleanly seeded with ONLY 3 users (Seeker, Employer, Admin) with full cross-portal workflows!")


if __name__ == "__main__":
    from sqlalchemy import select, delete
    asyncio.run(seed())


