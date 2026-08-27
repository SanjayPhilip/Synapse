"""
Unit tests for Employer Team Invites router
"""
import pytest
from httpx import AsyncClient

@pytest.mark.asyncio
async def test_employer_team_invites_flow(client: AsyncClient):
    # 1. Register employer
    emp_res = await client.post("/api/v1/auth/register", json={
        "email": "emp@acme.demo",
        "full_name": "Employer Boss",
        "company_name": "Acme Inc",
        "password": "Password123!",
        "role": "employer"
    })
    assert emp_res.status_code == 200
    emp_token = emp_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {emp_token}"}

    # 2. Register seeker
    seeker_res = await client.post("/api/v1/auth/register", json={
        "email": "seeker@acme.demo",
        "full_name": "Job Seeker",
        "password": "Password123!",
        "role": "seeker"
    })
    assert seeker_res.status_code == 200
    seeker_token = seeker_res.json()["access_token"]

    # 3. Employer creates invite
    res = await client.post(
        "/api/v1/employers/invites",
        json={"email": "colleague@acme.demo", "role": "employer_member"},
        headers=headers,
    )
    assert res.status_code == 201
    data = res.json()
    assert data["email"] == "colleague@acme.demo"
    assert data["status"] == "pending"
    invite_id = data["id"]

    # 4. List invites
    res = await client.get("/api/v1/employers/invites", headers=headers)
    assert res.status_code == 200
    invites = res.json()
    assert len(invites) >= 1
    assert any(i["id"] == invite_id for i in invites)

    # 5. Seeker forbidden from creating invites
    seeker_headers = {"Authorization": f"Bearer {seeker_token}"}
    res = await client.post(
        "/api/v1/employers/invites",
        json={"email": "colleague2@acme.demo"},
        headers=seeker_headers,
    )
    assert res.status_code == 403

    # 6. Revoke invite
    res = await client.delete(f"/api/v1/employers/invites/{invite_id}", headers=headers)
    assert res.status_code == 200
    assert res.json()["message"] == "Invite revoked successfully."
