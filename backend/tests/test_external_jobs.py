from datetime import datetime

import httpx
from httpx import AsyncClient
from sqlalchemy import select, func

from app.models import ExternalJob, JobPosting, SavedJob, AutoApplyLog
from app.database import async_session
from app.config import get_settings


async def _register_and_login(client: AsyncClient, email: str) -> str:
    resp = await client.post('/api/v1/auth/register', json={
        'email': email,
        'full_name': email.split('@')[0].title(),
        'password': 'TestPass123!',
        'role': 'seeker',
        'company_name': None,
    })
    assert resp.status_code == 200, resp.text
    data = resp.json()
    await client.post('/api/v1/auth/verify-email', json={'token': data['user']['verify_token']})
    login = await client.post('/api/v1/auth/login', json={'email': email, 'password': 'TestPass123!'})
    return login.json()['access_token']


async def _seed_external_job(**overrides):
    data = {
        'external_source': 'adzuna',
        'external_id': 'adz-1',
        'title': 'Python Engineer',
        'company': 'Acme Inc',
        'description': 'Python developer with FastAPI and SQL experience',
        'requirements': ['Python', 'FastAPI'],
        'location': 'Remote',
        'is_remote': True,
        'salary_min': 80000,
        'salary_max': 120000,
        'salary_currency': 'USD',
        'job_type': 'full_time',
        'category': 'Software Engineering',
        'external_url': 'https://example.com/job/1',
        'posted_at': datetime.utcnow(),
    }
    data.update(overrides)
    async with async_session() as session:
        job = ExternalJob(**data)
        session.add(job)
        await session.commit()
        return str(job.id)


async def _count(model):
    async with async_session() as session:
        result = await session.execute(select(func.count()).select_from(model))
        return result.scalar_one()


def _adzuna_payload(ext_id: str, title: str = 'Python Engineer') -> dict:
    return {
        'external_source': 'adzuna',
        'external_id': ext_id,
        'title': title,
        'company': 'Acme Inc',
        'description': 'Python developer with FastAPI and SQL experience',
        'requirements': ['Python', 'FastAPI'],
        'location': 'Remote',
        'is_remote': True,
        'salary_min': 80000,
        'salary_max': 120000,
        'salary_currency': 'USD',
        'job_type': 'full_time',
        'category': 'Software Engineering',
        'external_url': 'https://example.com/job/adzuna',
        'posted_at': datetime.utcnow(),
    }


def _jsearch_payload(ext_id: str, title: str = 'Data Scientist') -> dict:
    return {
        'external_source': 'jsearch',
        'external_id': ext_id,
        'title': title,
        'company': 'Data Co',
        'description': 'Data scientist with Python and SQL',
        'requirements': ['Python', 'SQL'],
        'location': 'New York, USA',
        'is_remote': False,
        'salary_min': 90000,
        'salary_max': 130000,
        'salary_currency': 'USD',
        'job_type': 'full_time',
        'category': None,
        'external_url': 'https://example.com/job/jsearch',
        'posted_at': datetime.utcnow(),
    }


def _enable_keys(monkeypatch):
    settings = get_settings()
    monkeypatch.setattr(settings, 'ADZUNA_APP_ID', 'test-id')
    monkeypatch.setattr(settings, 'ADZUNA_APP_KEY', 'test-key')
    monkeypatch.setattr(settings, 'JSEARCH_API_KEY', 'test-key')


async def test_search_falls_back_to_cache_when_no_keys(client: AsyncClient):
    job_id = await _seed_external_job()
    token = await _register_and_login(client, 'seeker1@test.com')
    headers = {'Authorization': f'Bearer {token}'}

    resp = await client.get('/api/v1/external-jobs/search', params={'q': 'Python'}, headers=headers)
    assert resp.status_code == 200, resp.text
    data = resp.json()
    assert data['stale'] is True
    assert any(j['id'] == job_id for j in data['jobs'])


async def test_search_upserts_and_dedupes(client: AsyncClient, monkeypatch):
    _enable_keys(monkeypatch)

    async def fake_adzuna(q, location, limit=20):
        return [_adzuna_payload('adz-1')]

    async def fake_jsearch(q, location, limit=20):
        return [_jsearch_payload('js-1')]

    monkeypatch.setattr('app.services.external_jobs.fetch_adzuna_jobs', fake_adzuna)
    monkeypatch.setattr('app.services.external_jobs.fetch_jsearch_jobs', fake_jsearch)

    token = await _register_and_login(client, 'testuser2@test.com')
    headers = {'Authorization': f'Bearer {token}'}

    resp = await client.get('/api/v1/external-jobs/search', params={'q': 'Python'}, headers=headers)
    assert resp.status_code == 200, resp.text
    data = resp.json()
    assert data['stale'] is False
    assert len(data['jobs']) == 2
    assert await _count(ExternalJob) == 2

    async def fake_adzuna2(q, location, limit=10):
        return [_adzuna_payload('adz-1', title='Senior Python Engineer')]

    monkeypatch.setattr('app.services.external_jobs.fetch_adzuna_jobs', fake_adzuna2)
    resp2 = await client.get('/api/v1/external-jobs/search', params={'q': 'Python'}, headers=headers)
    assert resp2.status_code == 200, resp2.text
    assert len(resp2.json()['jobs']) == 2
    assert await _count(ExternalJob) == 2


async def test_search_falls_back_when_providers_fail(client: AsyncClient, monkeypatch):
    _enable_keys(monkeypatch)
    job_id = await _seed_external_job()

    async def failing(q, location, limit=10):
        raise httpx.HTTPError('provider down')

    monkeypatch.setattr('app.services.external_jobs.fetch_adzuna_jobs', failing)
    monkeypatch.setattr('app.services.external_jobs.fetch_jsearch_jobs', failing)

    token = await _register_and_login(client, 'testuser3@test.com')
    headers = {'Authorization': f'Bearer {token}'}

    resp = await client.get('/api/v1/external-jobs/search', params={'q': 'Python'}, headers=headers)
    assert resp.status_code == 200, resp.text
    data = resp.json()
    assert data['stale'] is True
    assert any(j['id'] == job_id for j in data['jobs'])


async def test_save_materializes_job_and_creates_saved_job(client: AsyncClient):
    job_id = await _seed_external_job()
    token = await _register_and_login(client, 'testuser4@test.com')
    headers = {'Authorization': f'Bearer {token}'}

    resp = await client.post(f'/api/v1/external-jobs/{job_id}/save', headers=headers)
    assert resp.status_code == 200, resp.text
    data = resp.json()
    assert data['saved'] is True
    posting_id = data['job_posting_id']

    async with async_session() as session:
        jp = await session.get(JobPosting, posting_id)
        assert jp is not None
        assert jp.external_source == 'adzuna'
        assert jp.external_id == 'adz-1'
        assert jp.external_url == 'https://example.com/job/1'
        assert jp.title == 'Python Engineer'

    assert await _count(SavedJob) == 1

    resp2 = await client.post(f'/api/v1/external-jobs/{job_id}/save', headers=headers)
    assert resp2.status_code == 200, resp2.text
    assert resp2.json()['saved'] is True
    assert await _count(SavedJob) == 1


async def test_apply_creates_pending_log(client: AsyncClient):
    job_id = await _seed_external_job()
    token = await _register_and_login(client, 'testuser5@test.com')
    headers = {'Authorization': f'Bearer {token}'}

    resp = await client.post(f'/api/v1/external-jobs/{job_id}/apply', headers=headers)
    assert resp.status_code == 200, resp.text
    data = resp.json()
    assert data['log_id']

    async with async_session() as session:
        log = await session.get(AutoApplyLog, data['log_id'])
        assert log is not None
        assert log.status == 'pending'
        assert log.attempt_count == 0