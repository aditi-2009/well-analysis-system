"""
tests/test_auth.py

Test authentication endpoints.
"""

# from app.db.models.user import User
# from app.auth.password import hash_password


def test_register_user(client, test_db):
    """Test user registration."""
    response = client.post(
        "/api/v1/auth/register",
        json={
            "email": "test@example.com",
            "password": "testpass123",
        },
    )
    assert response.status_code == 200
    data = response.json()
    assert data["email"] == "test@example.com"
    assert "password" not in data


def test_register_duplicate_email(client, test_db):
    """Test registering with existing email."""
    # Create first user
    client.post(
        "/api/v1/auth/register",
        json={
            "email": "test@example.com",
            "password": "testpass123",
        },
    )

    # Try to register same email again
    response = client.post(
        "/api/v1/auth/register",
        json={
            "email": "test@example.com",
            "password": "testpass123",
        },
    )
    assert response.status_code == 400
    assert "already registered" in response.json()["detail"]


def test_login_user(client, test_db):
    """Test user login."""
    # Register first
    client.post(
        "/api/v1/auth/register",
        json={
            "email": "test@example.com",
            "password": "testpass123",
        },
    )

    # Then login
    response = client.post(
        "/api/v1/auth/login",
        json={
            "email": "test@example.com",
            "password": "testpass123",
        },
    )
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"


def test_login_invalid_credentials(client):
    """Test login with wrong password."""
    response = client.post(
        "/api/v1/auth/login",
        json={
            "email": "nonexistent@example.com",
            "password": "wrongpass",
        },
    )
    assert response.status_code == 401
    assert "Invalid" in response.json()["detail"]


def test_get_current_user(client, test_db):
    """Test getting current user profile."""
    # Register and login
    client.post(
        "/api/v1/auth/register",
        json={
            "email": "test@example.com",
            "password": "testpass123",
        },
    )

    login_response = client.post(
        "/api/v1/auth/login",
        json={
            "email": "test@example.com",
            "password": "testpass123",
        },
    )

    token = login_response.json()["access_token"]

    # Get profile
    response = client.get(
        "/api/v1/auth/me",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["email"] == "test@example.com"
