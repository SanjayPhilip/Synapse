import uuid
import numpy as np
import pytest
from httpx import AsyncClient
from unittest.mock import patch


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


async def test_match_score(client: AsyncClient):
    employer_token = await _register_and_login(client, 'employer2@test.com', 'employer')
    seeker_token = await _register_and_login(client, 'seeker2@test.com', 'seeker')

    job_resp = await client.post('/api/v1/jobs', json={
        'title': 'Python Developer',
        'description': 'Looking for a Python developer',
        'requirements': ['Python', 'FastAPI'],
        'category': 'Software Engineering',
    }, headers={'Authorization': f'Bearer {employer_token}'})
    assert job_resp.status_code == 200, job_resp.text
    job = job_resp.json()

    resume_resp = await client.post('/api/v1/resumes', json={
        'file_name': 'match_test.pdf',
        'parsed_data': {},
        'raw_text': 'Python developer with FastAPI experience',
        'skills': ['Python', 'FastAPI'],
    }, headers={'Authorization': f'Bearer {seeker_token}'})
    assert resume_resp.status_code == 200, resume_resp.text
    resume = resume_resp.json()

    emb = np.array([1.0, 0.0])
    with patch('app.services.matching.get_model') as mock_get_model:
        mock_model = mock_get_model.return_value
        mock_model.encode.return_value = [emb, emb]
        match_resp = await client.post(
            f'/api/v1/matching/match-resume/{resume["id"]}/{job["id"]}',
            headers={'Authorization': f'Bearer {seeker_token}'}
        )

    assert match_resp.status_code == 200, match_resp.text
    data = match_resp.json()
    assert 'overall_score' in data
    assert 'keyword_score' in data
    assert 'semantic_score' in data
    assert 'gap_report' in data
