import uuid
import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
class TestJobsAdvancedSearch:
    async def _setup_data(self, client: AsyncClient):
        # Register and verify employer
        unique_email = f"adv_emp_{uuid.uuid4().hex[:6]}@synapse.demo"
        reg_resp = await client.post('/api/v1/auth/register', json={
            'email': unique_email,
            'full_name': 'Adv Employer',
            'password': 'TestPass123!',
            'role': 'employer',
        })
        assert reg_resp.status_code == 200
        data_reg = reg_resp.json()
        await client.post('/api/v1/auth/verify-email', json={'token': data_reg['user']['verify_token']})

        login_resp = await client.post('/api/v1/auth/login', json={'email': unique_email, 'password': 'TestPass123!'})
        assert login_resp.status_code == 200
        token = login_resp.json()['access_token']
        headers = {'Authorization': f'Bearer {token}'}

        # Create diverse job postings
        jobs_data = [
            {
                "title": "Senior Python Backend Engineer",
                "description": "Looking for a senior engineer with Python and Docker experience.",
                "requirements": ["Python", "FastAPI", "Docker", "PostgreSQL"],
                "responsibilities": ["Design APIs", "Lead migrations"],
                "location": "San Francisco, CA",
                "is_remote": True,
                "salary_min": 140000,
                "salary_max": 180000,
                "salary_currency": "USD",
                "job_type": "full_time",
                "category": "Software Engineering",
            },
            {
                "title": "Junior Frontend Developer",
                "description": "Entry level frontend developer with React knowledge.",
                "requirements": ["React", "TypeScript", "Tailwind CSS"],
                "responsibilities": ["Build UI components"],
                "location": "New York, NY",
                "is_remote": False,
                "salary_min": 70000,
                "salary_max": 85000,
                "salary_currency": "USD",
                "job_type": "full_time",
                "category": "Software Engineering",
            },
            {
                "title": "Data Science Consultant",
                "description": "Contract position analyzing machine learning models.",
                "requirements": ["Python", "Machine Learning", "SQL"],
                "responsibilities": ["Build models"],
                "location": "Remote, USA",
                "is_remote": True,
                "salary_min": 90000,
                "salary_max": 110000,
                "salary_currency": "USD",
                "job_type": "contract",
                "category": "Data Science & AI",
            },
        ]

        created_jobs = []
        for jd in jobs_data:
            r = await client.post('/api/v1/jobs', json=jd, headers=headers)
            assert r.status_code == 200
            created_jobs.append(r.json())

        return headers, created_jobs

    async def test_get_facets(self, client: AsyncClient):
        headers, _ = await self._setup_data(client)
        resp = await client.get('/api/v1/jobs/facets', headers=headers)
        assert resp.status_code == 200
        data = resp.json()

        assert "categories" in data
        assert "job_types" in data
        assert "work_modes" in data
        assert "experience_levels" in data
        assert "salary_brackets" in data
        assert "top_skills" in data
        assert "locations" in data
        assert data["total_jobs"] >= 3

        # Verify work modes
        assert data["work_modes"]["remote"] >= 2
        assert data["work_modes"]["on_site"] >= 1

        # Verify experience levels
        assert data["experience_levels"]["Senior Level"] >= 1
        assert data["experience_levels"]["Entry Level"] >= 1

        # Verify skills
        skill_names = [s["name"] for s in data["top_skills"]]
        assert "Python" in skill_names or "React" in skill_names

    async def test_filter_by_remote(self, client: AsyncClient):
        headers, _ = await self._setup_data(client)
        resp = await client.get('/api/v1/jobs?is_remote=true', headers=headers)
        assert resp.status_code == 200
        items = resp.json()['items']
        assert len(items) > 0
        for item in items:
            assert item['is_remote'] is True

    async def test_filter_by_job_type(self, client: AsyncClient):
        headers, _ = await self._setup_data(client)
        resp = await client.get('/api/v1/jobs?job_type=contract', headers=headers)
        assert resp.status_code == 200
        items = resp.json()['items']
        assert len(items) > 0
        for item in items:
            assert item['job_type'] == 'contract'

    async def test_filter_by_min_salary(self, client: AsyncClient):
        headers, _ = await self._setup_data(client)
        resp = await client.get('/api/v1/jobs?min_salary=130000', headers=headers)
        assert resp.status_code == 200
        items = resp.json()['items']
        assert len(items) > 0
        for item in items:
            assert (item['salary_max'] or item['salary_min']) >= 130000

    async def test_filter_by_experience_level(self, client: AsyncClient):
        headers, _ = await self._setup_data(client)
        resp = await client.get('/api/v1/jobs?experience_level=senior', headers=headers)
        assert resp.status_code == 200
        items = resp.json()['items']
        assert len(items) > 0
        assert all("senior" in item['title'].lower() for item in items)

    async def test_filter_by_skill(self, client: AsyncClient):
        headers, _ = await self._setup_data(client)
        resp = await client.get('/api/v1/jobs?skill=React', headers=headers)
        assert resp.status_code == 200
        items = resp.json()['items']
        assert len(items) > 0
        for item in items:
            assert any("react" in req.lower() for req in item['requirements']) or "react" in item['title'].lower() or "react" in item['description'].lower()
