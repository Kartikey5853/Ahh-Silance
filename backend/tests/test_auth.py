"""
Unit and integration tests for authentication, password hashing, and JWT security.

Validates that users can log in with seeded credentials (test / test123),
receive signed JWT tokens, access authenticated profiles, and handle invalid credentials.
"""

import pytest
from starlette.testclient import TestClient
from backend.main import app

client = TestClient(app)


def _ensure_test_user():
    client.post("/api/v1/auth/register", json={
        "username": "test",
        "password": "test123",
        "full_name": "Test User",
        "role": "Professor"
    })


def test_seeded_user_login_success():
    """
    Validates that the test user (test / test123) successfully logs in.
    """
    _ensure_test_user()
    response = client.post("/api/v1/auth/login", json={
        "username": "test",
        "password": "test123"
    })
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"
    assert data["username"] == "test"
    assert isinstance(data["user_id"], int)


def test_invalid_password_rejected():
    """
    Validates that wrong passwords result in 401 Unauthorized status.
    """
    response = client.post("/api/v1/auth/login", json={
        "username": "test",
        "password": "wrongpassword"
    })
    assert response.status_code == 401
    assert "Incorrect username or password" in response.json()["detail"]


def test_authenticated_profile_endpoint():
    """
    Validates that a valid JWT token grants access to /api/v1/auth/me.
    """
    # 1. Login
    login_res = client.post("/api/v1/auth/login", json={
        "username": "test",
        "password": "test123"
    })
    token = login_res.json()["access_token"]

    # 2. Get profile with Bearer header
    profile_res = client.get("/api/v1/auth/me", headers={
        "Authorization": f"Bearer {token}"
    })
    assert profile_res.status_code == 200
    user_data = profile_res.json()
    assert user_data["username"] == "test"


def test_unauthenticated_request_rejected():
    """
    Validates that accessing protected endpoints without a token returns 401.
    """
    res = client.get("/api/v1/auth/me")
    assert res.status_code == 401
