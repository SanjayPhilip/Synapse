"""Tests for resume upload, parsing, versioning, and CRUD."""
import pytest
from httpx import AsyncClient
from app.models import Resume
from app.database import async_session
from sqlalchemy import select


async def _register_and_login(client: AsyncClient, email: str, role: str = 'seeker') -> str:
    resp = await client.post('/api/v1/auth/register', json={
        'email': email,
        'full_name': email.split('@')[0].title(),
        'password': 'TestPass123!',
        'role': role,
    })
    assert resp.status_code == 200, resp.text
    data = resp.json()
    await client.post('/api/v1/auth/verify-email', json={'token': data['user']['verify_token']})
    login = await client.post('/api/v1/auth/login', json={'email': email, 'password': 'TestPass123!'})
    return login.json()['access_token']


async def _count_resumes(user_id: str) -> int:
    async with async_session() as session:
        result = await session.execute(
            select(Resume).where(Resume.seeker_id == user_id)
        )
        return len(result.scalars().all())


async def test_resume_upload_and_parse(client: AsyncClient):
    """Test uploading a resume file and parsing it."""
    token = await _register_and_login(client, 'resume1@test.com')
    headers = {'Authorization': f'Bearer {token}'}

    # Create a simple text file as resume
    content = b"""
    John Doe
    john.doe@example.com
    +1-555-0123
    linkedin.com/in/johndoe
    
    EXPERIENCE
    Senior Python Developer at TechCorp (2020-2023)
    - Built FastAPI microservices
    - Used PostgreSQL, Redis, Docker
    
    Software Engineer at StartupXYZ (2018-2020)
    - Developed React/TypeScript frontend
    - Node.js backend APIs
    
    EDUCATION
    BS Computer Science, State University
    
    SKILLS
    Python, FastAPI, PostgreSQL, Docker, React, TypeScript, Node.js
    """

    resp = await client.post(
        '/api/v1/resumes/upload',
        files={'file': ('resume.txt', content, 'text/plain')},
        headers=headers,
    )
    assert resp.status_code == 200, resp.text
    data = resp.json()
    assert data['id'] is not None
    assert data['file_name'] == 'resume.txt'
    assert data['is_current'] is True
    assert data['version'] == 1
    assert 'Python' in data['parsed_data'].get('skills', [])
    assert 'FastAPI' in data['parsed_data'].get('skills', [])
    assert 'john.doe@example.com' in data['parsed_data'].get('contact', {}).get('email', '')


async def test_resume_versioning(client: AsyncClient):
    """Test creating multiple resume versions and restoring."""
    token = await _register_and_login(client, 'resume2@test.com')
    headers = {'Authorization': f'Bearer {token}'}

    # Upload first resume
    content1 = b"Python developer with Django experience"
    resp1 = await client.post(
        '/api/v1/resumes/upload',
        files={'file': ('resume1.txt', content1, 'text/plain')},
        headers=headers,
    )
    assert resp1.status_code == 200
    resume1 = resp1.json()
    assert resume1['version'] == 1
    assert resume1['is_current'] is True

    # Upload second resume (should create version 2)
    content2 = b"Python developer with FastAPI and React experience"
    resp2 = await client.post(
        '/api/v1/resumes/upload',
        files={'file': ('resume2.txt', content2, 'text/plain')},
        headers=headers,
    )
    assert resp2.status_code == 200
    resume2 = resp2.json()
    assert resume2['version'] == 2
    assert resume2['is_current'] is True

    # List resumes - should have both versions
    list_resp = await client.get('/api/v1/resumes', headers=headers)
    assert list_resp.status_code == 200
    resumes = list_resp.json()
    assert len(resumes) == 2
    # Current should be first
    assert resumes[0]['is_current'] is True
    assert resumes[0]['version'] == 2
    assert resumes[1]['version'] == 1
    assert resumes[1]['is_current'] is False

    # Restore version 1
    restore_resp = await client.post(
        f'/api/v1/resumes/{resume1["id"]}/restore',
        headers=headers,
    )
    assert restore_resp.status_code == 200
    restored = restore_resp.json()
    assert restored['is_current'] is True
    assert restored['version'] == 3  # New version created from restore

    # List again - version 3 should be current
    list_resp2 = await client.get('/api/v1/resumes', headers=headers)
    resumes2 = list_resp2.json()
    assert resumes2[0]['is_current'] is True
    assert resumes2[0]['version'] == 3


async def test_resume_manual_paste(client: AsyncClient):
    """Test manual paste/resume creation endpoint."""
    token = await _register_and_login(client, 'resume3@test.com')
    headers = {'Authorization': f'Bearer {token}'}

    resp = await client.post('/api/v1/resumes', json={
        'file_name': 'manual.txt',
        'parsed_data': {},
        'raw_text': 'Jane Smith\njane@example.com\nPython, FastAPI, AWS',
        'skills': ['Python', 'FastAPI', 'AWS'],
    }, headers=headers)
    assert resp.status_code == 200, resp.text
    data = resp.json()
    assert data['file_name'] == 'manual.txt'
    assert data['skills'] == ['Python', 'FastAPI', 'AWS']
    assert data['raw_text'] == 'Jane Smith\njane@example.com\nPython, FastAPI, AWS'


async def test_resume_parse_endpoint(client: AsyncClient):
    """Test the /resumes/parse endpoint for AI parsing."""
    token = await _register_and_login(client, 'resume4@test.com')
    headers = {'Authorization': f'Bearer {token}'}

    # This endpoint should parse text and return structured data
    resp = await client.post('/api/v1/resumes/parse', json={
        'raw_text': 'Bob Wilson\nbob@email.com\n+1-555-9999\nlinkedin.com/in/bobwilson\n\nExperience:\nSenior Dev at Corp (2021-present)\n- Python, FastAPI, PostgreSQL\n\nEducation:\nMS CS, Tech University\n\nSkills: Python, FastAPI, PostgreSQL, Docker, Kubernetes',
    }, headers=headers)
    assert resp.status_code == 200, resp.text
    data = resp.json()
    assert 'parsed_data' in data
    assert 'skills' in data
    assert 'Python' in data['skills']


async def test_resume_crud_operations(client: AsyncClient):
    """Test resume update and delete operations."""
    token = await _register_and_login(client, 'resume5@test.com')
    headers = {'Authorization': f'Bearer {token}'}

    # Create resume
    resp = await client.post('/api/v1/resumes', json={
        'file_name': 'test.pdf',
        'parsed_data': {'skills': ['Python']},
        'raw_text': 'Python developer',
        'skills': ['Python'],
    }, headers=headers)
    assert resp.status_code == 200
    resume = resp.json()
    resume_id = resume['id']

    # Update - should fail as we don't have update endpoint for basic fields
    # but we can test setting current
    # (current is set via restore or new upload)

    # Delete
    del_resp = await client.delete(f'/api/v1/resumes/{resume_id}', headers=headers)
    assert del_resp.status_code == 200

    # List should be empty
    list_resp = await client.get('/api/v1/resumes', headers=headers)
    assert list_resp.status_code == 200
    assert len(list_resp.json()) == 0


async def test_resume_duplicate_prevention(client: AsyncClient):
    """Test that duplicate file uploads create new versions not duplicates."""
    token = await _register_and_login(client, 'resume6@test.com')
    headers = {'Authorization': f'Bearer {token}'}

    content = b"Same content uploaded twice"
    
    # Upload first time
    resp1 = await client.post(
        '/api/v1/resumes/upload',
        files={'file': ('same.txt', content, 'text/plain')},
        headers=headers,
    )
    assert resp1.status_code == 200
    
    # Upload second time with same content
    resp2 = await client.post(
        '/api/v1/resumes/upload',
        files={'file': ('same.txt', content, 'text/plain')},
        headers=headers,
    )
    assert resp2.status_code == 200
    
    # Should have 2 versions
    list_resp = await client.get('/api/v1/resumes', headers=headers)
    resumes = list_resp.json()
    assert len(resumes) == 2
    assert resumes[0]['version'] == 2
    assert resumes[1]['version'] == 1