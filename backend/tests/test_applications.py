import pytest
from httpx import AsyncClient
from app.models import MatchScore
from app.database import async_session
from sqlalchemy import select


async def _register_and_login(client: AsyncClient, email: str, role: str = 'seeker') -> str:
    resp = await client.post('/api/v1/auth/register', json={
        'email': email,
        'full_name': email.split('@')[0].title(),
        'password': 'TestPass123!',
        'role': role,
        'company_name': 'Test Co' if role == 'employer' else None,
    })
    assert resp.status_code == 200, resp.text
    data = resp.json()
    await client.post('/api/v1/auth/verify-email', json={'token': data['user']['verify_token']})
    login = await client.post('/api/v1/auth/login', json={'email': email, 'password': 'TestPass123!'})
    return login.json()['access_token']


async def test_auto_screening_shortlist(client: AsyncClient):
    employer_token = await _register_and_login(client, 'employer@test.com', 'employer')
    seeker_token = await _register_and_login(client, 'seeker@test.com', 'seeker')

    job_resp = await client.post('/api/v1/jobs', json={
        'title': 'Test Job',
        'description': 'Python developer needed',
        'requirements': ['Python', 'FastAPI'],
        'location': 'Remote',
        'category': 'Software Engineering',
        'auto_screening_enabled': True,
        'auto_approve_threshold': 80,
        'auto_reject_threshold': 40,
    }, headers={'Authorization': f'Bearer {employer_token}'})
    assert job_resp.status_code == 200, job_resp.text
    job = job_resp.json()

    resume_resp = await client.post('/api/v1/resumes', json={
        'file_name': 'test.pdf',
        'parsed_data': {},
        'raw_text': 'Python developer with FastAPI experience',
        'skills': ['Python', 'FastAPI', 'SQL'],
    }, headers={'Authorization': f'Bearer {seeker_token}'})
    assert resume_resp.status_code == 200, resume_resp.text
    resume = resume_resp.json()

    async with async_session() as session:
        result = await session.execute(
            select(MatchScore).where(
                MatchScore.resume_id == resume['id'],
                MatchScore.job_posting_id == job['id'],
                MatchScore.direction == 'seeker',
            )
        )
        existing = result.scalars().all()
        for ms in existing:
            await session.delete(ms)
        await session.commit()

        ms = MatchScore(
            resume_id=resume['id'],
            job_posting_id=job['id'],
            direction='seeker',
            overall_score=90.0,
            keyword_score=80.0,
            semantic_score=95.0,
            gap_report={
                'missing_skills': [],
                'matched_skills': ['Python'],
                'experience_gaps': [],
                'keyword_mismatches': [],
                'strengths': ['Python'],
            },
        )
        session.add(ms)
        await session.commit()

    apply_resp = await client.post('/api/v1/applications', json={
        'job_posting_id': job['id'],
        'resume_id': resume['id'],
        'applied_via': 'platform',
    }, headers={'Authorization': f'Bearer {seeker_token}'})
    assert apply_resp.status_code == 200, apply_resp.text
    assert apply_resp.json()['status'] == 'shortlisted'


async def test_auto_screen_computes_missing_score(client: AsyncClient):
    employer_token = await _register_and_login(client, 'employer2@test.com', 'employer')
    seeker_token = await _register_and_login(client, 'seeker2@test.com', 'seeker')

    job_resp = await client.post('/api/v1/jobs', json={
        'title': 'Python Backend Job',
        'description': 'Python developer with FastAPI experience',
        'requirements': ['Python', 'FastAPI'],
        'location': 'Remote',
        'category': 'Software Engineering',
        'auto_screening_enabled': True,
        'auto_approve_threshold': 60,
        'auto_reject_threshold': 20,
    }, headers={'Authorization': f'Bearer {employer_token}'})
    assert job_resp.status_code == 200, job_resp.text
    job = job_resp.json()

    resume_resp = await client.post('/api/v1/resumes', json={
        'file_name': 'test.pdf',
        'parsed_data': {},
        'raw_text': 'Python developer building FastAPI services',
        'skills': ['Python', 'FastAPI', 'SQL'],
    }, headers={'Authorization': f'Bearer {seeker_token}'})
    assert resume_resp.status_code == 200, resume_resp.text
    resume = resume_resp.json()

    async with async_session() as session:
        result = await session.execute(
            select(MatchScore).where(
                MatchScore.resume_id == resume['id'],
                MatchScore.job_posting_id == job['id'],
            )
        )
        for ms in result.scalars().all():
            await session.delete(ms)
        await session.commit()

    apply_resp = await client.post('/api/v1/applications', json={
        'job_posting_id': job['id'],
        'resume_id': resume['id'],
        'applied_via': 'platform',
    }, headers={'Authorization': f'Bearer {seeker_token}'})
    assert apply_resp.status_code == 200, apply_resp.text
    app_data = apply_resp.json()
    assert app_data['status'] != 'applied'

    async with async_session() as session:
        result = await session.execute(
            select(MatchScore).where(
                MatchScore.resume_id == resume['id'],
                MatchScore.job_posting_id == job['id'],
            )
        )
        assert result.scalars().one() is not None

    history_resp = await client.get(
        f"/api/v1/applications/{app_data['id']}/history",
        headers={'Authorization': f'Bearer {seeker_token}'},
    )
    assert history_resp.status_code == 200, history_resp.text
    reasons = [h['reason'] for h in history_resp.json()]
    assert 'submitted' in reasons and 'auto_screen' in reasons


async def test_manual_override_records_audit_trail(client: AsyncClient):
    employer_token = await _register_and_login(client, 'employer3@test.com', 'employer')
    seeker_token = await _register_and_login(client, 'seeker3@test.com', 'seeker')

    job_resp = await client.post('/api/v1/jobs', json={
        'title': 'Manual Screen Job',
        'description': 'Any job',
        'requirements': [],
        'location': 'Remote',
        'category': 'Software Engineering',
        'auto_screening_enabled': False,
    }, headers={'Authorization': f'Bearer {employer_token}'})
    assert job_resp.status_code == 200, job_resp.text
    job = job_resp.json()

    apply_resp = await client.post('/api/v1/applications', json={
        'job_posting_id': job['id'],
        'resume_id': None,
        'applied_via': 'platform',
    }, headers={'Authorization': f'Bearer {seeker_token}'})
    assert apply_resp.status_code == 200, apply_resp.text
    app_id = apply_resp.json()['id']

    update_resp = await client.put(f'/api/v1/applications/{app_id}', json={
        'status': 'shortlisted',
        'employer_notes': 'Strong background',
    }, headers={'Authorization': f'Bearer {employer_token}'})
    assert update_resp.status_code == 200, update_resp.text

    history_resp = await client.get(
        f'/api/v1/applications/{app_id}/history',
        headers={'Authorization': f'Bearer {employer_token}'},
    )
    assert history_resp.status_code == 200, history_resp.text
    history = history_resp.json()
    assert len(history) == 2
    manual = history[-1]
    assert manual['old_status'] == 'applied'
    assert manual['new_status'] == 'shortlisted'
    assert manual['reason'] == 'manual'
    assert manual['notes'] == 'Strong background'
