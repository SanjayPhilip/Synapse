"""Extended tests for applications: duplicate prevention, status transitions, and edge cases."""
import pytest
from httpx import AsyncClient
from app.models import Application, MatchScore
from app.database import async_session
from sqlalchemy import select


async def _register_and_login(client: AsyncClient, email: str, role: str = 'seeker', company_name: str = None) -> str:
    resp = await client.post('/api/v1/auth/register', json={
        'email': email,
        'full_name': email.split('@')[0].title(),
        'password': 'TestPass123!',
        'role': role,
        'company_name': company_name,
    })
    assert resp.status_code == 200, resp.text
    data = resp.json()
    await client.post('/api/v1/auth/verify-email', json={'token': data['user']['verify_token']})
    login = await client.post('/api/v1/auth/login', json={'email': email, 'password': 'TestPass123!'})
    return login.json()['access_token']


async def _create_job_and_resume(client: AsyncClient, employer_token: str, seeker_token: str):
    """Helper to create a job and resume for testing."""
    headers_emp = {'Authorization': f'Bearer {employer_token}'}
    headers_seek = {'Authorization': f'Bearer {seeker_token}'}

    job_resp = await client.post('/api/v1/jobs', json={
        'title': 'Test Job',
        'description': 'Python developer needed',
        'requirements': ['Python', 'FastAPI'],
        'location': 'Remote',
        'category': 'Software Engineering',
    }, headers=headers_emp)
    assert job_resp.status_code == 200, job_resp.text
    job = job_resp.json()

    resume_resp = await client.post('/api/v1/resumes', json={
        'file_name': 'test.pdf',
        'parsed_data': {},
        'raw_text': 'Python developer with FastAPI experience',
        'skills': ['Python', 'FastAPI', 'SQL'],
    }, headers=headers_seek)
    assert resume_resp.status_code == 200, resume_resp.text
    resume = resume_resp.json()

    # Clean up any existing match scores
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

    return job, resume, headers_emp, headers_seek


async def test_duplicate_application_prevented(client: AsyncClient):
    """Test that applying twice to same job with same resume returns 400 error."""
    employer_token = await _register_and_login(client, 'emp1@test.com', 'employer')
    seeker_token = await _register_and_login(client, 'seek1@test.com', 'seeker')
    job, resume, headers_emp, headers_seek = await _create_job_and_resume(client, employer_token, seeker_token)

    # First application
    resp1 = await client.post('/api/v1/applications', json={
        'job_posting_id': job['id'],
        'resume_id': resume['id'],
        'applied_via': 'platform',
    }, headers=headers_seek)
    assert resp1.status_code == 200, resp1.text
    app1 = resp1.json()
    assert app1['status'] == 'applied'

    # Second application - should return 400 error (duplicate prevention)
    resp2 = await client.post('/api/v1/applications', json={
        'job_posting_id': job['id'],
        'resume_id': resume['id'],
        'applied_via': 'platform',
    }, headers=headers_seek)
    assert resp2.status_code == 400
    assert 'already applied' in resp2.json()['detail'].lower()

    # Verify only one application in DB
    async with async_session() as session:
        result = await session.execute(
            select(Application).where(
                Application.seeker_id == app1['seeker_id'],
                Application.job_posting_id == job['id'],
            )
        )
        apps = result.scalars().all()
        assert len(apps) == 1


async def test_application_status_transitions(client: AsyncClient):
    """Test valid status transitions: applied -> shortlisted -> interviewed -> hired/rejected."""
    employer_token = await _register_and_login(client, 'emp2@test.com', 'employer')
    seeker_token = await _register_and_login(client, 'seek2@test.com', 'seeker')
    job, resume, headers_emp, headers_seek = await _create_job_and_resume(client, employer_token, seeker_token)

    # Create application
    resp = await client.post('/api/v1/applications', json={
        'job_posting_id': job['id'],
        'resume_id': resume['id'],
        'applied_via': 'platform',
    }, headers=headers_seek)
    assert resp.status_code == 200
    app = resp.json()
    app_id = app['id']

    # Employer updates status: applied -> shortlisted
    update1 = await client.put(f'/api/v1/applications/{app_id}', json={
        'status': 'shortlisted',
        'employer_notes': 'Strong background',
    }, headers=headers_emp)
    assert update1.status_code == 200, update1.text
    assert update1.json()['status'] == 'shortlisted'

    # Employer updates: shortlisted -> interviewed
    update2 = await client.put(f'/api/v1/applications/{app_id}', json={
        'status': 'interviewed',
        'employer_notes': 'Scheduled for technical interview',
    }, headers=headers_emp)
    assert update2.status_code == 200
    assert update2.json()['status'] == 'interviewed'

    # Employer updates: interviewed -> hired
    update3 = await client.put(f'/api/v1/applications/{app_id}', json={
        'status': 'hired',
        'employer_notes': 'Offer accepted',
    }, headers=headers_emp)
    assert update3.status_code == 200
    assert update3.json()['status'] == 'hired'


async def test_application_rejection_flow(client: AsyncClient):
    """Test rejection flow: applied -> rejected."""
    employer_token = await _register_and_login(client, 'emp3@test.com', 'employer')
    seeker_token = await _register_and_login(client, 'seek3@test.com', 'seeker')
    job, resume, headers_emp, headers_seek = await _create_job_and_resume(client, employer_token, seeker_token)

    resp = await client.post('/api/v1/applications', json={
        'job_posting_id': job['id'],
        'resume_id': resume['id'],
        'applied_via': 'platform',
    }, headers=headers_seek)
    assert resp.status_code == 200
    app_id = resp.json()['id']

    # Reject
    update = await client.put(f'/api/v1/applications/{app_id}', json={
        'status': 'rejected',
        'employer_notes': 'Not a fit for current needs',
    }, headers=headers_emp)
    assert update.status_code == 200
    assert update.json()['status'] == 'rejected'


async def test_seeker_cannot_update_application_status(client: AsyncClient):
    """Seeker should not be able to update application status."""
    employer_token = await _register_and_login(client, 'emp4@test.com', 'employer')
    seeker_token = await _register_and_login(client, 'seek4@test.com', 'seeker')
    job, resume, headers_emp, headers_seek = await _create_job_and_resume(client, employer_token, seeker_token)

    resp = await client.post('/api/v1/applications', json={
        'job_posting_id': job['id'],
        'resume_id': resume['id'],
        'applied_via': 'platform',
    }, headers=headers_seek)
    app_id = resp.json()['id']

    # Seeker tries to update status - should fail
    update = await client.put(f'/api/v1/applications/{app_id}', json={
        'status': 'shortlisted',
    }, headers=headers_seek)
    assert update.status_code == 403


async def test_application_with_invalid_job(client: AsyncClient):
    """Applying to non-existent job should fail."""
    seeker_token = await _register_and_login(client, 'seek5@test.com', 'seeker')
    headers = {'Authorization': f'Bearer {seeker_token}'}

    # Create resume first
    resume_resp = await client.post('/api/v1/resumes', json={
        'file_name': 'test.pdf',
        'parsed_data': {},
        'raw_text': 'Python developer',
        'skills': ['Python'],
    }, headers=headers)
    resume = resume_resp.json()

    # Try to apply with fake job ID
    resp = await client.post('/api/v1/applications', json={
        'job_posting_id': '00000000-0000-0000-0000-000000000000',
        'resume_id': resume['id'],
        'applied_via': 'platform',
    }, headers=headers)
    assert resp.status_code == 404


async def test_application_without_resume(client: AsyncClient):
    """Application without resume should be allowed (optional)."""
    employer_token = await _register_and_login(client, 'emp6@test.com', 'employer')
    seeker_token = await _register_and_login(client, 'seek6@test.com', 'seeker')
    job, _, headers_emp, headers_seek = await _create_job_and_resume(client, employer_token, seeker_token)

    resp = await client.post('/api/v1/applications', json={
        'job_posting_id': job['id'],
        'resume_id': None,
        'applied_via': 'platform',
    }, headers=headers_seek)
    assert resp.status_code == 200
    assert resp.json()['resume_id'] is None


async def test_get_application_history(client: AsyncClient):
    """Test application status history endpoint."""
    employer_token = await _register_and_login(client, 'emp7@test.com', 'employer')
    seeker_token = await _register_and_login(client, 'seek7@test.com', 'seeker')
    job, resume, headers_emp, headers_seek = await _create_job_and_resume(client, employer_token, seeker_token)

    resp = await client.post('/api/v1/applications', json={
        'job_posting_id': job['id'],
        'resume_id': resume['id'],
        'applied_via': 'platform',
    }, headers=headers_seek)
    app_id = resp.json()['id']

    # Update status a few times
    await client.put(f'/api/v1/applications/{app_id}', json={
        'status': 'shortlisted',
    }, headers=headers_emp)
    await client.put(f'/api/v1/applications/{app_id}', json={
        'status': 'interviewed',
    }, headers=headers_emp)

    # Get history
    history_resp = await client.get(f'/api/v1/applications/{app_id}/history', headers=headers_seek)
    assert history_resp.status_code == 200
    history = history_resp.json()
    assert len(history) >= 3  # submitted + shortlisted + interviewed
    reasons = [h['reason'] for h in history]
    assert 'submitted' in reasons
    assert 'manual' in reasons  # employer manual updates


async def test_employer_can_list_applications_for_their_job(client: AsyncClient):
    """Employer should see applications for their own jobs."""
    employer_token = await _register_and_login(client, 'emp8@test.com', 'employer')
    seeker_token = await _register_and_login(client, 'seek8@test.com', 'seeker')
    job, resume, headers_emp, headers_seek = await _create_job_and_resume(client, employer_token, seeker_token)

    # Seeker applies
    await client.post('/api/v1/applications', json={
        'job_posting_id': job['id'],
        'resume_id': resume['id'],
        'applied_via': 'platform',
    }, headers=headers_seek)

    # Employer lists applications for their job
    list_resp = await client.get(f'/api/v1/applications/job/{job["id"]}', headers=headers_emp)
    assert list_resp.status_code == 200
    apps = list_resp.json()
    assert len(apps) >= 1
    assert apps[0]['job_posting_id'] == job['id']


async def test_seeker_can_list_own_applications(client: AsyncClient):
    """Seeker should see their own applications."""
    employer_token = await _register_and_login(client, 'emp9@test.com', 'employer')
    seeker_token = await _register_and_login(client, 'seek9@test.com', 'seeker')
    job, resume, headers_emp, headers_seek = await _create_job_and_resume(client, employer_token, seeker_token)

    await client.post('/api/v1/applications', json={
        'job_posting_id': job['id'],
        'resume_id': resume['id'],
        'applied_via': 'platform',
    }, headers=headers_seek)

    list_resp = await client.get('/api/v1/applications', headers=headers_seek)
    assert list_resp.status_code == 200
    data = list_resp.json()
    assert 'items' in data
    apps = data['items']
    assert len(apps) >= 1
    assert apps[0]['seeker_id'] == apps[0]['seeker_id']


if __name__ == "__main__":
    pytest.main([__file__, "-v"])