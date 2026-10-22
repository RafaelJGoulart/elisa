from __future__ import annotations

from datetime import date, timedelta

import pytest
from sqlalchemy import func, select

from app.core.extensions import db
from app.models import ActivityLog, XpEvent
from app.services import xp_service


def _profile(client) -> dict:
    response = client.get("/api/profile")
    assert response.status_code == 200, response.get_json()
    return response.get_json()["profile"]


def _units(client) -> dict[str, dict]:
    response = client.get("/api/units")
    assert response.status_code == 200
    return {unit["code"]: unit for unit in response.get_json()["units"]}


def _create_measurable(
    client,
    *,
    unit_id: int,
    target: float | None = 10,
    frequency: str = "daily",
    name: str = "Leitura",
):
    payload = {
        "name": name,
        "category": "Estudo",
        "color": "purple",
        "kind": "measurable",
        "unitId": unit_id,
        "frequency": frequency,
    }
    if target is not None:
        payload["targetAmount"] = target
    response = client.post("/api/activities", json=payload)
    assert response.status_code == 201, response.get_json()
    return response.get_json()["activity"]


def _completed_week_start() -> date:
    today = date.today()
    current_week_start = today - timedelta(days=(today.weekday() + 1) % 7)
    return current_week_start - timedelta(days=14)


def _log(client, activity_id: int, day: date):
    response = client.post(
        f"/api/activities/{activity_id}/logs", json={"date": day.isoformat()}
    )
    assert response.status_code == 201, response.get_json()
    return response


def _progress(client, activity_id: int, day: date, amount: float):
    response = client.post(
        f"/api/activities/{activity_id}/progress",
        json={"date": day.isoformat(), "amount": amount},
    )
    assert response.status_code == 201, response.get_json()
    return response.get_json()["entry"]


def _event_count(app) -> int:
    with app.app_context():
        return int(db.session.scalar(select(func.count(XpEvent.id))))


def test_empty_profile_starts_at_level_zero(client):
    profile = _profile(client)

    assert profile["level"] == 0
    assert profile["totalXp"] == 0
    assert profile["xpToNextLevel"] == 7
    assert profile["progressPercent"] == 0
    assert profile["stats"] == {
        "habitOccurrences": 0,
        "habitWeeks": 0,
        "habitXp": 0,
    }
    assert profile["categories"] == []
    assert profile["recentEvents"] == []


def test_level_curve_is_normalized_and_continuous():
    assert xp_service.xp_total_for_level(-2) == 0
    assert xp_service.xp_total_for_level(0) == 0
    assert xp_service.xp_total_for_level(1) == 7
    assert xp_service.xp_total_for_level(2) == 16
    assert xp_service.xp_total_for_level(16) == 352
    assert xp_service.xp_total_for_level(17) == 394
    assert xp_service.xp_total_for_level(31) == 1507
    assert xp_service.xp_total_for_level(32) == 1628

    previous = 0
    for level in range(0, 201):
        current = xp_service.xp_total_for_level(level)
        assert current >= previous
        previous = current

    for total in (0, 6, 7, 15, 16, 393, 394, 1506, 1507, 1628, 10**9):
        level = xp_service.level_for_xp(total)
        assert xp_service.xp_total_for_level(level) <= total
        assert xp_service.xp_total_for_level(level + 1) > total

    progress = xp_service.progression_for_xp(14)
    assert progress.level == 1
    assert progress.xp_into_level == 7
    assert progress.xp_to_next_level == 2
    assert progress.progress_percent == pytest.approx(77.78, abs=0.01)


def test_profile_backfills_historical_logs_and_persists(client, app, activity):
    day = date.today() - timedelta(days=1)
    with app.app_context():
        db.session.add(ActivityLog(activity_id=activity["id"], date=day))
        db.session.commit()
    assert _event_count(app) == 0

    profile = _profile(client)
    assert profile["totalXp"] == 1
    assert _event_count(app) == 1

    assert _profile(client)["totalXp"] == 1
    assert _event_count(app) == 1


def test_binary_habit_grants_xp_and_weekly_bonus_once(client, app, activity):
    week_start = _completed_week_start()
    for offset in range(7):
        _log(client, activity["id"], week_start + timedelta(days=offset))

    profile = _profile(client)
    assert profile["totalXp"] == 14
    assert profile["stats"] == {
        "habitOccurrences": 7,
        "habitWeeks": 1,
        "habitXp": 14,
    }
    assert profile["categories"] == [{"key": "habits", "label": "Hábitos", "xp": 14}]
    assert len(profile["recentEvents"]) == 8
    assert _event_count(app) == 8

    with app.app_context():
        xp_service.sync_activity(activity["id"])
        db.session.commit()
    assert _event_count(app) == 8
    assert _profile(client)["totalXp"] == 14


def test_removing_and_restoring_log_recalculates_xp(client, activity):
    week_start = _completed_week_start()
    for offset in range(7):
        _log(client, activity["id"], week_start + timedelta(days=offset))

    removed_day = week_start + timedelta(days=3)
    response = client.delete(
        f"/api/activities/{activity['id']}/logs/{removed_day.isoformat()}"
    )
    assert response.status_code == 204

    profile = _profile(client)
    assert profile["totalXp"] == 6
    assert profile["stats"]["habitOccurrences"] == 6
    assert profile["stats"]["habitWeeks"] == 0
    assert any(event["amount"] == -7 for event in profile["recentEvents"])

    _log(client, activity["id"], removed_day)
    profile = _profile(client)
    assert profile["totalXp"] == 14
    assert profile["stats"]["habitOccurrences"] == 7
    assert profile["stats"]["habitWeeks"] == 1


def test_measurable_weekly_habit_does_not_require_seven_days(client):
    units = _units(client)
    habit = _create_measurable(
        client,
        unit_id=units["km"]["id"],
        target=5,
        frequency="weekly",
        name="Caminhada",
    )
    week_start = _completed_week_start()

    _progress(client, habit["id"], week_start, 3)
    assert _profile(client)["totalXp"] == 0

    _progress(client, habit["id"], week_start + timedelta(days=2), 2)
    profile = _profile(client)
    assert profile["totalXp"] == 8
    assert profile["stats"] == {
        "habitOccurrences": 1,
        "habitWeeks": 1,
        "habitXp": 8,
    }


def test_measurable_daily_partial_records_do_not_grant_xp(client):
    units = _units(client)
    habit = _create_measurable(client, unit_id=units["pages"]["id"], target=10)
    today = date.today()

    first = _progress(client, habit["id"], today, 5)
    assert _profile(client)["totalXp"] == 0

    second = _progress(client, habit["id"], today, 5)
    assert _profile(client)["totalXp"] == 1
    assert _profile(client)["stats"]["habitOccurrences"] == 1

    edited = client.patch(
        f"/api/activities/{habit['id']}/progress/{first['id']}",
        json={"amount": 4},
    )
    assert edited.status_code == 200
    assert _profile(client)["totalXp"] == 0

    restored = client.patch(
        f"/api/activities/{habit['id']}/progress/{first['id']}",
        json={"amount": 5},
    )
    assert restored.status_code == 200
    assert _profile(client)["totalXp"] == 1

    removed = client.delete(
        f"/api/activities/{habit['id']}/progress/{second['id']}"
    )
    assert removed.status_code == 204
    assert _profile(client)["totalXp"] == 0


def test_monthly_habit_grants_occurrence_without_weekly_bonus(client):
    units = _units(client)
    habit = _create_measurable(
        client,
        unit_id=units["pages"]["id"],
        target=100,
        frequency="monthly",
        name="Leitura mensal",
    )
    _progress(client, habit["id"], date.today(), 100)

    profile = _profile(client)
    assert profile["totalXp"] == 1
    assert profile["stats"] == {
        "habitOccurrences": 1,
        "habitWeeks": 0,
        "habitXp": 1,
    }


def test_deleting_activity_revokes_xp_but_preserves_history(client, app):
    response = client.post(
        "/api/activities",
        json={
            "name": "Meditacao",
            "category": "Bem-estar",
            "color": "blue",
        },
    )
    habit = response.get_json()["activity"]
    _log(client, habit["id"], date.today())
    assert _profile(client)["totalXp"] == 1

    deleted = client.delete(f"/api/activities/{habit['id']}")
    assert deleted.status_code == 204

    profile = _profile(client)
    assert profile["totalXp"] == 0
    assert profile["stats"]["habitOccurrences"] == 0
    assert profile["categories"] == []
    assert len(profile["recentEvents"]) == 2
    assert profile["recentEvents"][0]["amount"] == -1
    assert profile["recentEvents"][0]["reason"] == "correction"
    assert _event_count(app) == 2


def test_archived_habit_remains_in_profile(client, activity):
    _log(client, activity["id"], date.today())
    archived = client.patch(
        f"/api/activities/{activity['id']}", json={"archived": True}
    )
    assert archived.status_code == 200

    profile = _profile(client)
    assert profile["totalXp"] == 1
    assert profile["stats"]["habitOccurrences"] == 1
