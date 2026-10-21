from __future__ import annotations


def test_health_reports_database_ok(client):
    response = client.get("/api/health")

    assert response.status_code == 200
    payload = response.get_json()
    assert payload["status"] == "ok"
    assert payload["database"] == "ok"
    assert payload["version"]
