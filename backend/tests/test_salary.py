import pytest
from httpx import AsyncClient
from app.services.salary import calculate_salary_benchmarks, generate_negotiation_strategy
from app.models import Profile
from app.middleware.auth import create_access_token


class TestSalaryService:
    def test_benchmark_calculation(self):
        b_min, b_mid, b_max = calculate_salary_benchmarks("Software Engineer", "Mid-Level", "Remote")
        assert b_min > 0
        assert b_min < b_mid < b_max
        assert b_mid >= 100000

    def test_senior_multiplier(self):
        _, mid_mid, _ = calculate_salary_benchmarks("Backend Developer", "Mid-Level", "Remote")
        _, senior_mid, _ = calculate_salary_benchmarks("Backend Developer", "Senior", "Remote")
        assert senior_mid > mid_mid

    @pytest.mark.asyncio
    async def test_negotiation_strategy_generation(self):
        resp = await generate_negotiation_strategy(
            job_title="Full Stack Developer",
            offered_salary=95000,
            location="Austin",
            experience_level="Mid-Level",
        )
        assert resp.job_title == "Full Stack Developer"
        assert resp.recommended_counter > 95000
        assert resp.recommended_counter_percentage > 0
        assert len(resp.scripts) == 3
        assert any("Counter-Offer" in s.title for s in resp.scripts)
        assert len(resp.leverage_points) > 0
        assert len(resp.tactical_tips) > 0


class TestSalaryApi:
    @pytest.mark.asyncio
    async def test_salary_negotiate_endpoint(self, client: AsyncClient):
        # Register and login test seeker
        reg_resp = await client.post('/api/v1/auth/register', json={
            'email': 'salary_tester@synapse.demo',
            'full_name': 'Salary Tester',
            'password': 'TestPass123!',
            'role': 'seeker',
        })
        assert reg_resp.status_code == 200
        data_reg = reg_resp.json()
        await client.post('/api/v1/auth/verify-email', json={'token': data_reg['user']['verify_token']})
        login_resp = await client.post('/api/v1/auth/login', json={'email': 'salary_tester@synapse.demo', 'password': 'TestPass123!'})
        token = login_resp.json()['access_token']

        response = await client.post(
            "/api/v1/salary/negotiate",
            headers={"Authorization": f"Bearer {token}"},
            json={
                "job_title": "Senior Data Scientist",
                "offered_salary": 140000,
                "location": "San Francisco",
                "experience_level": "Senior",
                "currency": "USD",
            },
        )
        assert response.status_code == 200
        data = response.json()
        assert data["job_title"] == "Senior Data Scientist"
        assert data["benchmark_mid"] > 140000
        assert data["recommended_counter"] >= 140000
        assert len(data["scripts"]) == 3
        assert len(data["leverage_points"]) > 0
