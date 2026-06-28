import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
from app.models.user import User
from app.repositories import user as user_repo

def test_user_registration(client: TestClient, db: Session):
    # Test valid registration
    response = client.post(
        "/api/auth/register",
        json={
            "phone": "+1234567890",
            "username": "tester",
            "display_name": "Test User",
            "password": "secretpassword",
            "otp": "123456"
        }
    )
    assert response.status_code == 210 or response.status_code == 201
    data = response.json()
    assert "access_token" in data
    assert "refresh_token" in data
    assert data["user"]["username"] == "tester"
    
    # Test registering duplicate username
    response2 = client.post(
        "/api/auth/register",
        json={
            "phone": "+9876543210",
            "username": "tester",
            "display_name": "Test User 2",
            "password": "password",
            "otp": "123456"
        }
    )
    assert response2.status_code == 400
    assert "already taken" in response2.json()["detail"]

def test_user_login(client: TestClient, db: Session):
    # Setup user
    user_repo.create_user(db, phone="+1234567890", username="tester", display_name="Tester", password="password123")
    
    # Test correct login
    response = client.post(
        "/api/auth/login",
        json={
            "identifier": "tester",
            "password": "password123",
            "otp": "123456"
        }
    )
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert data["user"]["phone"] == "+1234567890"
    
    # Test incorrect credentials
    response_fail = client.post(
        "/api/auth/login",
        json={
            "identifier": "tester",
            "password": "wrongpassword"
        }
    )
    assert response_fail.status_code == 401

def get_auth_headers(client: TestClient, phone: str, username: str) -> dict:
    client.post(
        "/api/auth/register",
        json={
            "phone": phone,
            "username": username,
            "display_name": username.capitalize(),
            "password": "password123",
            "otp": "123456"
        }
    )
    login_res = client.post(
        "/api/auth/login",
        json={
            "identifier": username,
            "password": "password123"
        }
    )
    token = login_res.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}

def test_contact_management(client: TestClient, db: Session):
    # Setup Alice and Bob
    alice_headers = get_auth_headers(client, "+1000000001", "alice")
    
    # Register Bob
    client.post(
        "/api/auth/register",
        json={
            "phone": "+1000000002",
            "username": "bob",
            "display_name": "Bob",
            "password": "password123",
            "otp": "123456"
        }
    )
    
    # Alice adds Bob
    response = client.post(
        "/api/contacts",
        json={"identifier": "bob"},
        headers=alice_headers
    )
    assert response.status_code == 201
    data = response.json()
    assert data["contact_user"]["username"] == "bob"
    
    # Get contacts list
    list_res = client.get("/api/contacts", headers=alice_headers)
    assert list_res.status_code == 200
    assert len(list_res.json()) == 1
    assert list_res.json()[0]["contact_user"]["username"] == "bob"

def test_conversation_management(client: TestClient, db: Session):
    alice_headers = get_auth_headers(client, "+1000000001", "alice")
    
    # Register Bob
    bob_reg = client.post(
        "/api/auth/register",
        json={
            "phone": "+1000000002",
            "username": "bob",
            "display_name": "Bob",
            "password": "password123",
            "otp": "123456"
        }
    )
    bob_id = bob_reg.json()["user"]["id"]
    
    # Start 1-on-1 conversation
    response = client.post(
        "/api/conversations",
        json={"recipient_id": bob_id},
        headers=alice_headers
    )
    assert response.status_code == 201
    conv_data = response.json()
    assert conv_data["is_group"] is False
    assert len(conv_data["members"]) == 2

def test_group_operations(client: TestClient, db: Session):
    alice_headers = get_auth_headers(client, "+1000000001", "alice")
    
    # Register Bob and Charlie
    bob_reg = client.post(
        "/api/auth/register",
        json={"phone": "+1000000002", "username": "bob", "display_name": "Bob", "password": "password123"}
    )
    bob_id = bob_reg.json()["user"]["id"]
    
    charlie_reg = client.post(
        "/api/auth/register",
        json={"phone": "+1000000003", "username": "charlie", "display_name": "Charlie", "password": "password123"}
    )
    charlie_id = charlie_reg.json()["user"]["id"]
    
    # Create group
    response = client.post(
        "/api/groups",
        json={
            "name": "Test Group",
            "description": "A group for test cases",
            "member_ids": [bob_id, charlie_id]
        },
        headers=alice_headers
    )
    assert response.status_code == 201
    data = response.json()
    assert data["name"] == "Test Group"
    assert data["is_group"] is True
    assert len(data["members"]) == 3  # Alice (creator) + Bob + Charlie
