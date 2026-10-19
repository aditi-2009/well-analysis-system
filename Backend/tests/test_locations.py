"""
tests/test_locations.py

Test location endpoints.
"""

from app.db.models.state import State

# from app.db.models.district import District


def test_get_states_empty(client):
    """Test GET /locations/states when empty."""
    response = client.get("/api/v1/locations/states")
    assert response.status_code == 200
    assert response.json() == []


def test_get_states_with_data(client, test_db):
    """Test GET /locations/states with data."""
    # Add state to database
    state = State(name="Maharashtra", code="MH")
    test_db.add(state)
    test_db.commit()

    response = client.get("/api/v1/locations/states")
    assert response.status_code == 200
    data = response.json()
    assert len(data) > 0
    assert data[0]["name"] == "Maharashtra"
