import pytest
from httpx import AsyncClient


async def test_register_and_login(client: AsyncClient):
    resp = await client.post('/api/v1/auth/register', json={
        'email': 'test@example.com',
        'full_name': 'Test User',
        'password': 'TestPass123!',
        'role': 'seeker',
    })
    assert resp.status_code == 200, resp.text
    data = resp.json()
    assert 'access_token' in data
    assert data['user']['is_verified'] is False
    verify_token = data['user']['verify_token']

    verify_resp = await client.post('/api/v1/auth/verify-email', json={'token': verify_token})
    assert verify_resp.status_code == 200

    login_resp = await client.post('/api/v1/auth/login', json={
        'email': 'test@example.com',
        'password': 'TestPass123!',
    })
    assert login_resp.status_code == 200, login_resp.text
    token = login_resp.json()['access_token']

    me_resp = await client.get('/api/v1/auth/me', headers={'Authorization': f'Bearer {token}'})
    assert me_resp.status_code == 200
    assert me_resp.json()['email'] == 'test@example.com'


async def test_resend_verification(client: AsyncClient):
    await client.post('/api/v1/auth/register', json={
        'email': 'resend@example.com',
        'full_name': 'Resend User',
        'password': 'TestPass123!',
        'role': 'seeker',
    })

    resp = await client.post('/api/v1/auth/resend-verification', json={'email': 'resend@example.com'})
    assert resp.status_code == 200, resp.text
    assert 'Verification email sent' in resp.json()['message']

    unknown = await client.post('/api/v1/auth/resend-verification', json={'email': 'nobody@example.com'})
    assert unknown.status_code == 404

    register_verified = await client.post('/api/v1/auth/register', json={
        'email': 'already@example.com',
        'full_name': 'Verified User',
        'password': 'TestPass123!',
        'role': 'seeker',
    })
    verify_resp = await client.post('/api/v1/auth/verify-email', json={
        'token': register_verified.json()['user']['verify_token'],
    })
    assert verify_resp.status_code == 200

    already = await client.post('/api/v1/auth/resend-verification', json={'email': 'already@example.com'})
    assert already.status_code == 400


async def test_forgot_password_flow(client: AsyncClient):
    await client.post('/api/v1/auth/register', json={
        'email': 'reset@example.com',
        'full_name': 'Reset User',
        'password': 'TestPass123!',
        'role': 'seeker',
    })

    resp = await client.post('/api/v1/auth/forgot-password', json={'email': 'reset@example.com'})
    assert resp.status_code == 200
    data = resp.json()
    assert data['reset_token'] is not None

    reset_resp = await client.post('/api/v1/auth/reset-password', json={
        'token': data['reset_token'],
        'new_password': 'NewPass123!',
    })
    assert reset_resp.status_code == 200

    # Account remains unverified after password reset, so login is still blocked
    login_resp = await client.post('/api/v1/auth/login', json={
        'email': 'reset@example.com',
        'password': 'NewPass123!',
    })
    assert login_resp.status_code == 403
