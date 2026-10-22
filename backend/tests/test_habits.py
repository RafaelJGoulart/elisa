from __future__ import annotations

from datetime import date
from pathlib import Path

from app import create_app
from app.core.extensions import db


def _units(client) -> dict[str, dict]:
    response = client.get("/api/units")
    assert response.status_code == 200
    return {unit["code"]: unit for unit in response.get_json()["units"]}


def _create_measurable(
    client,
    *,
    name: str = "Água",
    unit_id: int,
    target: float | None = 2,
    frequency: str = "daily",
    category: str = "Saúde",
    color: str = "blue",
):
    payload = {
        "name": name,
        "description": None,
        "category": category,
        "color": color,
        "kind": "measurable",
        "unitId": unit_id,
        "frequency": frequency,
    }
    if target is not None:
        payload["targetAmount"] = target
    response = client.post("/api/activities", json=payload)
    assert response.status_code == 201, response.get_json()
    return response.get_json()["activity"]


def test_default_units_and_custom_unit(client):
    units = _units(client)
    assert {"ml", "l", "m", "km", "min", "h", "pages", "brl", "kg"} <= set(units)
    assert units["l"]["category"] == "Volume"

    custom = client.post(
        "/api/units", json={"name": "Xícara", "symbol": "xíc."}
    )
    assert custom.status_code == 201
    unit = custom.get_json()["unit"]
    assert unit["category"] == "Personalizada"
    assert unit["dimension"].startswith("custom:")
    assert unit["isSystem"] is False

    assert unit["id"] in {item["id"] for item in client.get("/api/units").get_json()["units"]}


def test_binary_habit_fields_are_preserved(client, activity):
    assert activity["kind"] == "binary"
    assert activity["unit"] is None
    assert activity["targetAmount"] is None
    assert activity["frequency"] == "daily"
    assert activity["archived"] is False


def test_measurable_habit_accepts_multiple_entries_and_converts_units(client):
    units = _units(client)
    habit = _create_measurable(client, unit_id=units["l"]["id"], target=2)
    today = date.today().isoformat()

    first = client.post(
        f"/api/activities/{habit['id']}/progress",
        json={"date": today, "amount": 500, "unitId": units["ml"]["id"], "note": "Copo"},
    )
    assert first.status_code == 201, first.get_json()
    stats = first.get_json()["stats"]
    assert stats["todayAmount"] == 0.5
    assert stats["currentPeriodPercent"] == 25.0
    assert stats["currentPeriodMet"] is False
    assert stats["entriesCount"] == 1

    second = client.post(
        f"/api/activities/{habit['id']}/progress",
        json={"date": today, "amount": 600, "unitId": units["ml"]["id"]},
    )
    assert second.status_code == 201
    stats = second.get_json()["stats"]
    assert stats["todayAmount"] == 1.1
    assert stats["currentPeriodPercent"] == 55.0

    third = client.post(
        f"/api/activities/{habit['id']}/progress",
        json={"date": today, "amount": 1, "unitId": units["l"]["id"]},
    )
    assert third.status_code == 201
    stats = third.get_json()["stats"]
    assert stats["todayAmount"] == 2.1
    assert stats["currentPeriodAmount"] == 2.1
    assert stats["currentPeriodPercent"] == 105.0
    assert stats["currentPeriodMet"] is True
    assert stats["totalCompleted"] == 1
    assert stats["recordedDays"] == 1
    assert stats["averagePerRecordedDay"] == 2.1

    history = client.get(
        f"/api/activities/{habit['id']}/history?start={today}&end={today}"
    )
    assert history.status_code == 200
    payload = history.get_json()
    assert len(payload["progressEntries"]) == 3
    assert payload["logs"] == []
    assert payload["completedDates"] == [today]
    assert payload["stats"]["currentPeriodMet"] is True

    listed = client.get("/api/activities").get_json()["activities"][0]
    assert listed["stats"]["currentPeriodPercent"] == 105.0
    assert listed["recentLogs"] == [today]

    today_summary = client.get("/api/today").get_json()
    entry = today_summary["activities"][0]
    assert entry["completedToday"] is True
    assert entry["stats"]["todayAmount"] == 2.1
    assert entry["activity"]["kind"] == "measurable"


def test_edit_and_delete_progress_recalculates_stats(client):
    units = _units(client)
    habit = _create_measurable(
        client, name="Leitura", unit_id=units["pages"]["id"], target=10, category="Estudo"
    )
    today = date.today().isoformat()

    first = client.post(
        f"/api/activities/{habit['id']}/progress",
        json={"date": today, "amount": 5},
    )
    assert first.status_code == 201
    first_id = first.get_json()["entry"]["id"]

    second = client.post(
        f"/api/activities/{habit['id']}/progress",
        json={"date": today, "amount": 3},
    )
    second_id = second.get_json()["entry"]["id"]
    assert second.get_json()["stats"]["currentPeriodMet"] is False

    updated = client.patch(
        f"/api/activities/{habit['id']}/progress/{first_id}",
        json={"amount": 7, "note": "Edição"},
    )
    assert updated.status_code == 200
    stats = updated.get_json()["stats"]
    assert stats["todayAmount"] == 10
    assert stats["currentPeriodMet"] is True

    removed = client.delete(
        f"/api/activities/{habit['id']}/progress/{second_id}"
    )
    assert removed.status_code == 204
    stats = client.get(
        f"/api/activities/{habit['id']}/history?start={today}&end={today}"
    ).get_json()["stats"]
    assert stats["todayAmount"] == 7
    assert stats["currentPeriodMet"] is False

    missing = client.delete(
        f"/api/activities/{habit['id']}/progress/{second_id}"
    )
    assert missing.status_code == 404

    invalid = client.patch(
        f"/api/activities/{habit['id']}/progress/{first_id}",
        json={"amount": -1},
    )
    assert invalid.status_code == 422


def test_incompatible_units_are_rejected(client):
    units = _units(client)
    habit = _create_measurable(client, unit_id=units["l"]["id"], target=2)
    today = date.today().isoformat()

    response = client.post(
        f"/api/activities/{habit['id']}/progress",
        json={"date": today, "amount": 5, "unitId": units["pages"]["id"]},
    )
    assert response.status_code == 422
    assert "unitId" in response.get_json()["error"]["details"]["fields"]

    change = client.patch(
        f"/api/activities/{habit['id']}", json={"unitId": units["pages"]["id"]}
    )
    assert change.status_code == 422


def test_compatible_unit_change_converts_target_and_preserves_entries(client):
    units = _units(client)
    habit = _create_measurable(client, unit_id=units["l"]["id"], target=2)
    today = date.today().isoformat()
    client.post(
        f"/api/activities/{habit['id']}/progress",
        json={"date": today, "amount": 500, "unitId": units["ml"]["id"]},
    )

    changed = client.patch(
        f"/api/activities/{habit['id']}", json={"unitId": units["ml"]["id"]}
    )
    assert changed.status_code == 200, changed.get_json()
    updated = changed.get_json()["activity"]
    assert updated["unit"]["code"] == "ml"
    assert updated["targetAmount"] == 2000.0

    history = client.get(
        f"/api/activities/{habit['id']}/history?start={today}&end={today}"
    ).get_json()
    assert history["stats"]["currentPeriodAmount"] == 500.0
    assert history["stats"]["currentPeriodPercent"] == 25.0
    assert history["progressEntries"][0]["amount"] == 500.0
    assert history["progressEntries"][0]["unit"]["code"] == "ml"


def test_weekly_frequency_evaluates_week_goal(client):
    units = _units(client)
    habit = _create_measurable(
        client,
        name="Caminhada",
        unit_id=units["km"]["id"],
        target=5,
        frequency="weekly",
        category="Saúde",
        color="green",
    )
    today = date.today().isoformat()

    first = client.post(
        f"/api/activities/{habit['id']}/progress",
        json={"date": today, "amount": 3},
    )
    assert first.status_code == 201
    assert first.get_json()["stats"]["currentPeriodMet"] is False

    second = client.post(
        f"/api/activities/{habit['id']}/progress",
        json={"date": today, "amount": 3},
    )
    stats = second.get_json()["stats"]
    assert stats["currentPeriodAmount"] == 6.0
    assert stats["currentPeriodPercent"] == 120.0
    assert stats["currentPeriodMet"] is True
    assert stats["currentStreak"] == 1
    assert stats["totalCompleted"] == 1
    assert stats["weekAmount"] == 6.0


def test_measurable_habit_without_target_uses_recorded_days(client):
    units = _units(client)
    habit = _create_measurable(
        client, name="Flexões", unit_id=units["repetition"]["id"], target=None
    )
    today = date.today().isoformat()
    response = client.post(
        f"/api/activities/{habit['id']}/progress",
        json={"date": today, "amount": 20},
    )
    stats = response.get_json()["stats"]
    assert stats["currentPeriodPercent"] is None
    assert stats["currentPeriodMet"] is True
    assert stats["totalCompleted"] == 1


def test_validation_for_measurable_habits(client):
    units = _units(client)
    missing_unit = client.post(
        "/api/activities",
        json={
            "name": "Água",
            "description": None,
            "category": "Saúde",
            "color": "blue",
            "kind": "measurable",
            "targetAmount": 2,
        },
    )
    assert missing_unit.status_code == 422
    assert "unitId" in missing_unit.get_json()["error"]["details"]["fields"]

    binary_with_unit = client.post(
        "/api/activities",
        json={
            "name": "Rotina",
            "description": None,
            "category": "Saúde",
            "color": "blue",
            "kind": "binary",
            "unitId": units["l"]["id"],
        },
    )
    assert binary_with_unit.status_code == 422

    habit = _create_measurable(client, unit_id=units["pages"]["id"], target=10)
    future = client.post(
        f"/api/activities/{habit['id']}/progress",
        json={"date": "2999-01-01", "amount": 1},
    )
    assert future.status_code == 422

    as_log = client.post(
        f"/api/activities/{habit['id']}/logs",
        json={"date": date.today().isoformat()},
    )
    assert as_log.status_code == 422


def test_kind_change_is_blocked_while_records_exist(client):
    units = _units(client)
    habit = _create_measurable(client, unit_id=units["pages"]["id"], target=10)
    today = date.today().isoformat()
    client.post(
        f"/api/activities/{habit['id']}/progress",
        json={"date": today, "amount": 2},
    )
    blocked = client.patch(
        f"/api/activities/{habit['id']}", json={"kind": "binary"}
    )
    assert blocked.status_code == 422

    binary = client.post(
        "/api/activities",
        json={
            "name": "Meditação",
            "description": None,
            "category": "Bem-estar",
            "color": "purple",
        },
    ).get_json()["activity"]
    client.post(
        f"/api/activities/{binary['id']}/logs",
        json={"date": today},
    )
    blocked_binary = client.patch(
        f"/api/activities/{binary['id']}",
        json={"kind": "measurable", "unitId": units["min"]["id"]},
    )
    assert blocked_binary.status_code == 422


def test_measurable_habit_persists_across_app_instances(tmp_path: Path):
    units_file = tmp_path / "persist.db"
    config = {
        "TESTING": True,
        "SQLALCHEMY_DATABASE_URI": f"sqlite:///{units_file.as_posix()}",
        "SERVE_FRONTEND": False,
        "DATA_DIR": tmp_path,
    }

    first_app = create_app(config)
    with first_app.app_context():
        db.create_all()
    first_client = first_app.test_client()
    units = _units(first_client)
    habit = _create_measurable(first_client, unit_id=units["pages"]["id"], target=30)
    today = date.today().isoformat()
    client_response = first_client.post(
        f"/api/activities/{habit['id']}/progress",
        json={"date": today, "amount": 12},
    )
    assert client_response.status_code == 201
    with first_app.app_context():
        db.session.remove()

    second_app = create_app(config)
    second_client = second_app.test_client()
    listed = second_client.get("/api/activities")
    assert listed.status_code == 200
    stored = listed.get_json()["activities"][0]
    assert stored["kind"] == "measurable"
    assert stored["targetAmount"] == 30.0
    assert stored["stats"]["todayAmount"] == 12.0
    assert stored["stats"]["currentPeriodPercent"] == 40.0
