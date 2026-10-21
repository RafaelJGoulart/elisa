from __future__ import annotations

from pathlib import Path

from app import create_app
from app.core.extensions import db


def test_create_and_list_activity(client):
    response = client.post(
        "/api/activities",
        json={
            "name": "Corrida",
            "description": "Correr 5 km.",
            "category": "Saúde",
            "color": "green",
        },
    )

    assert response.status_code == 201
    created = response.get_json()["activity"]
    assert created["id"] > 0
    assert created["name"] == "Corrida"
    assert created["description"] == "Correr 5 km."
    assert created["category"] == "Saúde"
    assert created["color"] == "green"

    listed = client.get("/api/activities")
    assert listed.status_code == 200
    activities = listed.get_json()["activities"]
    assert len(activities) == 1
    assert activities[0]["stats"]["totalCompleted"] == 0
    assert activities[0]["stats"]["currentStreak"] == 0
    assert activities[0]["recentLogs"] == []


def test_create_activity_requires_valid_fields(client):
    response = client.post(
        "/api/activities",
        json={"name": " ", "description": "", "category": "", "color": "rosa"},
    )

    assert response.status_code == 422
    payload = response.get_json()
    assert payload["error"]["code"] == "validation_error"
    fields = payload["error"]["details"]["fields"]
    assert "name" in fields
    assert "category" in fields
    assert "color" in fields


def test_create_activity_requires_json(client):
    response = client.post("/api/activities")

    assert response.status_code == 422
    assert response.get_json()["error"]["code"] == "validation_error"


def test_update_activity(client, activity):
    response = client.patch(
        f"/api/activities/{activity['id']}",
        json={
            "name": "Leitura diária",
            "description": "Ler 30 minutos.",
            "category": "Estudo",
            "color": "blue",
        },
    )

    assert response.status_code == 200
    updated = response.get_json()["activity"]
    assert updated["name"] == "Leitura diária"
    assert updated["color"] == "blue"

    fetched = client.get(f"/api/activities/{activity['id']}")
    assert fetched.get_json()["activity"]["description"] == "Ler 30 minutos."


def test_update_activity_partial_payload(client, activity):
    response = client.patch(
        f"/api/activities/{activity['id']}",
        json={"name": "Leitura leve"},
    )

    assert response.status_code == 200
    updated = response.get_json()["activity"]
    assert updated["name"] == "Leitura leve"
    assert updated["category"] == "Estudo"


def test_delete_activity_and_missing_activity(client, activity):
    deleted = client.delete(f"/api/activities/{activity['id']}")
    assert deleted.status_code == 204

    missing = client.get(f"/api/activities/{activity['id']}")
    assert missing.status_code == 404
    assert missing.get_json()["error"]["code"] == "not_found"


def test_delete_missing_activity_returns_404(client):
    response = client.delete("/api/activities/9999")
    assert response.status_code == 404


def test_data_persists_across_app_instances(tmp_path: Path):
    database_path = tmp_path / "persist.db"
    config = {
        "TESTING": True,
        "SQLALCHEMY_DATABASE_URI": f"sqlite:///{database_path.as_posix()}",
        "SERVE_FRONTEND": False,
        "DATA_DIR": tmp_path,
    }

    first_app = create_app(config)
    with first_app.app_context():
        db.create_all()
    first_client = first_app.test_client()
    created = first_client.post(
        "/api/activities",
        json={
            "name": "Persistência",
            "description": None,
            "category": "Teste",
            "color": "orange",
        },
    )
    assert created.status_code == 201
    with first_app.app_context():
        db.session.remove()

    second_app = create_app(config)
    second_client = second_app.test_client()
    listed = second_client.get("/api/activities")

    assert listed.status_code == 200
    names = [item["name"] for item in listed.get_json()["activities"]]
    assert names == ["Persistência"]
