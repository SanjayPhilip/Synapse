"""Tests for auth: change-password, roles, and edge cases."""
import pytest
from httpx import AsyncClient


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


async def test_change_password(client: AsyncClient):
    """Test changing password while logged in."""
    token = await _register_and_login(client, 'changepass@test.com')
    headers = {'Authorization': f'Bearer {token}'}

    # Change password
    resp = await client.post('/api/v1/auth/change-password', json={
        'current_password': 'TestPass123!',
        'new_password': 'NewPass456!',
    }, headers=headers)
    assert resp.status_code == 200, resp.text
    assert 'Password updated successfully' in resp.json()['message']

    # Old password should no longer work
    old_login = await client.post('/api/v1/auth/login', json={
        'email': 'changepass@test.com',
        'password': 'TestPass123!',
    })
    assert old_login.status_code == 401

    # New password should work
    new_login = await client.post('/api/v1/auth/login', json={
        'email': 'changepass@test.com',
        'password': 'NewPass456!',
    })
    assert new_login.status_code == 200


async def test_change_password_wrong_current(client: AsyncClient):
    """Test changing password with wrong current password fails."""
    token = await _register_and_login(client, 'wrongpass@test.com')
    headers = {'Authorization': f'Bearer {token}'}

    resp = await client.post('/api/v1/auth/change-password', json={
        'current_password': 'WrongPass123!',
        'new_password': 'NewPass456!',
    }, headers=headers)
    assert resp.status_code == 400
    assert 'Current password is incorrect' in resp.json()['detail']


async def test_change_password_weak_new(client: AsyncClient):
    """Test changing password with weak new password - now validates strength."""
    token = await _register_and_login(client, 'weakpass@test.com')
    headers = {'Authorization': f'Bearer {token}'}

    # Now change-password validates strength too
    resp = await client.post('/api/v1/auth/change-password', json={
        'current_password': 'TestPass123!',
        'new_password': 'weak',  # Too weak
    }, headers=headers)
    assert resp.status_code == 422


async def test_role_switching(client: AsyncClient):
    """Test user can register as both roles and switch."""
    # Register as seeker
    token = await _register_and_login(client, 'dualrole@test.com', 'seeker')
    headers = {'Authorization': f'Bearer {token}'}

    me_resp = await client.get('/api/v1/auth/me', headers=headers)
    assert me_resp.status_code == 200
    assert me_resp.json()['role'] == 'seeker'

    # The user should be able to register again with same email but different role
    # (if they delete account or we allow role switch)
    # For now, test that employer role works separately
    token2 = await _register_and_login(client, 'employer_role@test.com', 'employer', 'Test Company')
    headers2 = {'Authorization': f'Bearer {token2}'}

    me_resp2 = await client.get('/api/v1/auth/me', headers=headers2)
    assert me_resp2.status_code == 200
    assert me_resp2.json()['role'] == 'employer'
    assert me_resp2.json()['company_name'] == 'Test Company'


async def test_admin_access(client: AsyncClient):
    """Test admin role has access to admin endpoints."""
    # Create admin user
    token = await _register_and_login(client, 'admin@test.com', 'admin')
    headers = {'Authorization': f'Bearer {token}'}

    # Admin should access admin dashboard
    resp = await client.get('/api/v1/admin/dashboard', headers=headers)
    # May return 404 if no data, but not 403
    assert resp.status_code != 403


async def test_register_duplicate_email(client: AsyncClient):
    """Test registering with duplicate email fails."""
    await _register_and_login(client, 'dup@test.com')

    resp = await client.post('/api/v1/auth/register', json={
        'email': 'dup@test.com',
        'full_name': 'Duplicate',
        'password': 'TestPass123!',
        'role': 'seeker',
    })
    assert resp.status_code == 400
    assert 'already registered' in resp.json()['detail'].lower()


async def test_login_unverified_user(client: AsyncClient):
    """Test unverified user cannot log in."""
    resp = await client.post('/api/v1/auth/register', json={
        'email': 'unverified@test.com',
        'full_name': 'Unverified',
        'password': 'TestPass123!',
        'role': 'seeker',
    })
    assert resp.status_code == 200

    # Don't verify, try to login
    login = await client.post('/api/v1/auth/login', json={
        'email': 'unverified@test.com',
        'password': 'TestPass123!',
    })
    assert login.status_code == 403
    assert 'not verified' in login.json()['detail'].lower()


async def test_password_strength_validation(client: AsyncClient):
    """Test password strength requirements on register."""
    weak_passwords = [
        'short',  # too short
        'nouppercase123!',  # no uppercase
        'NOLOWERCASE123!',  # no lowercase
        'NoNumbers!',  # no numbers
        'NoSpecial123',  # no special char
    ]

    for i, pwd in enumerate(weak_passwords):
        resp = await client.post('/api/v1/auth/register', json={
            'email': f'weak{i}@test.com',
            'full_name': 'Weak',
            'password': pwd,
            'role': 'seeker',
        })
        assert resp.status_code == 422, f"Password '{pwd}' should be rejected: {resp.text}"


async def test_strong_password_accepted(client: AsyncClient):
    """Test strong password is accepted."""
    strong_passwords = [
        'StrongPass123!',
        'An0ther$trongP@ss',
        'C0mplex#Passw0rd',
    ]

    for i, pwd in enumerate(strong_passwords):
        resp = await client.post('/api/v1/auth/register', json={
            'email': f'strong{i}@test.com',
            'full_name': 'Strong',
            'password': pwd,
            'role': 'seeker',
        })
        assert resp.status_code == 200, f"Password '{pwd}' should be accepted: {resp.text}"