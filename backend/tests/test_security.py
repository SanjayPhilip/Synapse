import pytest
from httpx import AsyncClient


async def _register_and_login(
    client: AsyncClient,
    email: str,
    password: str = "TestPass123!",
    full_name: str = "Security User",
):
    """Register, verify, and log in. Returns the login access token."""
    reg = await client.post('/api/v1/auth/register', json={
        'email': email,
        'full_name': full_name,
        'password': password,
        'role': 'seeker',
    })
    assert reg.status_code == 200, reg.text
    verify_token = reg.json()['user']['verify_token']
    assert verify_token is not None

    verify = await client.post('/api/v1/auth/verify-email', json={'token': verify_token})
    assert verify.status_code == 200, verify.text

    login = await client.post('/api/v1/auth/login', json={'email': email, 'password': password})
    assert login.status_code == 200, login.text
    return login.json()['access_token']


async def test_list_sessions(client: AsyncClient):
    token = await _register_and_login(client, 'sessions@example.com')
    headers = {'Authorization': f'Bearer {token}'}

    resp = await client.get('/api/v1/security/sessions', headers=headers)
    assert resp.status_code == 200, resp.text
    sessions = resp.json()
    # register created one session; login created the current one
    assert len(sessions) == 2
    current = [s for s in sessions if s['is_current']]
    assert len(current) == 1
    assert current[0]['id'] is not None
    assert current[0]['expires_at'] is not None


async def test_revoke_session(client: AsyncClient):
    token = await _register_and_login(client, 'revoke@example.com')
    headers = {'Authorization': f'Bearer {token}'}

    sessions = (await client.get('/api/v1/security/sessions', headers=headers)).json()
    assert len(sessions) == 2
    other = next(s for s in sessions if not s['is_current'])

    resp = await client.delete(f"/api/v1/security/sessions/{other['id']}", headers=headers)
    assert resp.status_code == 200, resp.text

    remaining = (await client.get('/api/v1/security/sessions', headers=headers)).json()
    ids = {s['id'] for s in remaining}
    assert other['id'] not in ids
    assert len(remaining) == 1

    # unknown session id -> 404
    resp = await client.delete('/api/v1/security/sessions/00000000-0000-0000-0000-000000000000', headers=headers)
    assert resp.status_code == 404


async def test_revoke_other_sessions(client: AsyncClient):
    token = await _register_and_login(client, 'revoke-all@example.com')
    headers = {'Authorization': f'Bearer {token}'}

    # create a second (non-current) session via another login
    second_login = await client.post('/api/v1/auth/login', json={
        'email': 'revoke-all@example.com',
        'password': 'TestPass123!',
    })
    assert second_login.status_code == 200, second_login.text
    second_token = second_login.json()['access_token']
    second_headers = {'Authorization': f'Bearer {second_token}'}

    sessions = (await client.get('/api/v1/security/sessions', headers=headers)).json()
    assert len(sessions) == 3

    resp = await client.delete('/api/v1/security/sessions', headers=headers)
    assert resp.status_code == 200, resp.text

    # only the current session survives
    remaining = (await client.get('/api/v1/security/sessions', headers=headers)).json()
    assert len(remaining) == 1
    assert remaining[0]['is_current'] is True

    # the revoked second token can no longer reach protected endpoints
    resp = await client.get('/api/v1/security/sessions', headers=second_headers)
    assert resp.status_code == 401


async def test_email_change_flow(client: AsyncClient):
    token = await _register_and_login(client, 'old-email@example.com')
    headers = {'Authorization': f'Bearer {token}'}

    change = await client.post('/api/v1/security/email/change', headers=headers, json={
        'new_email': 'new-email@example.com',
    })
    assert change.status_code == 200, change.text
    confirm_token = change.json().get('token')
    assert confirm_token is not None

    confirm = await client.post('/api/v1/security/email/confirm', json={'token': confirm_token})
    assert confirm.status_code == 200, confirm.text

    # all sessions revoked after email change
    resp = await client.get('/api/v1/security/sessions', headers=headers)
    assert resp.status_code == 401

    # old email no longer logs in; new email works
    old_login = await client.post('/api/v1/auth/login', json={
        'email': 'old-email@example.com',
        'password': 'TestPass123!',
    })
    assert old_login.status_code == 401

    new_login = await client.post('/api/v1/auth/login', json={
        'email': 'new-email@example.com',
        'password': 'TestPass123!',
    })
    assert new_login.status_code == 200, new_login.text


async def test_email_change_taken(client: AsyncClient):
    token = await _register_and_login(client, 'taken-a@example.com')
    await _register_and_login(client, 'taken-b@example.com')
    headers = {'Authorization': f'Bearer {token}'}

    resp = await client.post('/api/v1/security/email/change', headers=headers, json={
        'new_email': 'taken-b@example.com',
    })
    assert resp.status_code == 400


async def test_email_confirm_invalid_token(client: AsyncClient):
    resp = await client.post('/api/v1/security/email/confirm', json={'token': 'not-a-jwt'})
    assert resp.status_code == 400


async def test_delete_account(client: AsyncClient):
    token = await _register_and_login(client, 'delete@example.com')
    headers = {'Authorization': f'Bearer {token}'}

    # wrong password -> 400
    resp = await client.post('/api/v1/security/delete-account', headers=headers, json={
        'password': 'WrongPass123!',
        'confirm': True,
    })
    assert resp.status_code == 400

    # confirm flag must be true -> 400
    resp = await client.post('/api/v1/security/delete-account', headers=headers, json={
        'password': 'TestPass123!',
        'confirm': False,
    })
    assert resp.status_code == 400

    resp = await client.post('/api/v1/security/delete-account', headers=headers, json={
        'password': 'TestPass123!',
        'confirm': True,
    })
    assert resp.status_code == 200, resp.text

    # sessions revoked -> token rejected
    resp = await client.get('/api/v1/security/sessions', headers=headers)
    assert resp.status_code == 401

    # deactivated account cannot log in
    login = await client.post('/api/v1/auth/login', json={
        'email': 'delete@example.com',
        'password': 'TestPass123!',
    })
    assert login.status_code == 403

    # me endpoint rejects deactivated account
    resp = await client.get('/api/v1/auth/me', headers=headers)
    assert resp.status_code == 401
