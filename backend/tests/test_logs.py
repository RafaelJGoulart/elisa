from __future__ import annotations

from datetime import date, timedelta

from app.core.extensions import db
from app.models import ActivityLog


def _history(client, activity_id: int, start: date, end: date):
    return client.get(
        f"/api/activities/{activity_id}/history",
        query_string={"start": start.isoformat(), "end": end.isoformat()},
    )


def test_register_log_and_history(client, activity):
    today = date.today()

    created = client.post(
        f"/api/activities/{activity['id']}/logs",
        json={"date": today.isoformat()},
    )
    assert created.status_code == 201
    payload = created.get_json()
    assert payload["log"]["date"] == today.isoformat()
    assert payload["stats"]["totalCompleted"] == 1
    assert payload["stats"]["currentStreak"] == 1

    response = _history(client, activity["id"], today - timedelta(days=7), today)
    assert response.status_code == 200
    history = response.get_json()
    assert len(history["logs"]) == 1
    assert history["logs"][0]["date"] == today.isoformat()
    assert history["range"] == {
        "start": (today - timedelta(days=7)).isoformat(),
        "end": today.isoformat(),
    }


def test_duplicate_log_conflict(client, activity):
    today = date.today().isoformat()
    first = client.post(f"/api/activities/{activity['id']}/logs", json={"date": today})
    assert first.status_code == 201

    duplicate = client.post(
        f"/api/activities/{activity['id']}/logs", json={"date": today}
    )
    assert duplicate.status_code == 409
    assert duplicate.get_json()["error"]["code"] == "conflict"


def test_future_date_rejected(client, activity):
    future = (date.today() + timedelta(days=1)).isoformat()
    response = client.post(
        f"/api/activities/{activity['id']}/logs", json={"date": future}
    )

    assert response.status_code == 422
    assert "date" in response.get_json()["error"]["details"]["fields"]


def test_invalid_date_rejected(client, activity):
    response = client.post(
        f"/api/activities/{activity['id']}/logs", json={"date": "21/10/2026"}
    )
    assert response.status_code == 422


def test_streak_calculation(client, activity):
    today = date.today()
    dates = [today, today - timedelta(days=1), today - timedelta(days=3)]
    for value in dates:
        response = client.post(
            f"/api/activities/{activity['id']}/logs",
            json={"date": value.isoformat()},
        )
        assert response.status_code == 201

    response = _history(client, activity["id"], today - timedelta(days=10), today)
    stats = response.get_json()["stats"]
    assert stats["totalCompleted"] == 3
    assert stats["currentStreak"] == 2
    assert stats["longestStreak"] == 2
    assert stats["lastCompletedAt"] == today.isoformat()


def test_history_filters_by_range(client, activity):
    today = date.today()
    for value in [today, today - timedelta(days=5), today - timedelta(days=30)]:
        client.post(
            f"/api/activities/{activity['id']}/logs",
            json={"date": value.isoformat()},
        )

    response = _history(client, activity["id"], today - timedelta(days=7), today)
    logs = response.get_json()["logs"]
    assert [log["date"] for log in logs] == [
        (today - timedelta(days=5)).isoformat(),
        today.isoformat(),
    ]


def test_history_rejects_inverted_range(client, activity):
    today = date.today()
    response = _history(client, activity["id"], today, today - timedelta(days=1))
    assert response.status_code == 422


def test_remove_log(client, activity):
    today = date.today().isoformat()
    client.post(f"/api/activities/{activity['id']}/logs", json={"date": today})

    removed = client.delete(f"/api/activities/{activity['id']}/logs/{today}")
    assert removed.status_code == 204

    response = _history(
        client, activity["id"], date.today() - timedelta(days=2), date.today()
    )
    assert response.get_json()["logs"] == []

    missing = client.delete(f"/api/activities/{activity['id']}/logs/{today}")
    assert missing.status_code == 404


def test_delete_activity_removes_logs(app, client, activity):
    today = date.today().isoformat()
    client.post(f"/api/activities/{activity['id']}/logs", json={"date": today})

    assert client.delete(f"/api/activities/{activity['id']}").status_code == 204

    with app.app_context():
        assert db.session.query(ActivityLog).count() == 0


def test_today_summary(client, activity):
    today = date.today().isoformat()
    client.post(f"/api/activities/{activity['id']}/logs", json={"date": today})

    response = client.get("/api/today")
    assert response.status_code == 200
    summary = response.get_json()
    assert summary["date"] == today
    assert len(summary["activities"]) == 1
    entry = summary["activities"][0]
    assert entry["completedToday"] is True
    assert entry["currentStreak"] == 1
    assert entry["totalCompleted"] == 1
    assert entry["recentLogs"] == [today]


def test_today_summary_recent_logs_exclude_old_entries(client, activity):
    today = date.today()
    old = today - timedelta(days=90)
    for value in (old, today):
        response = client.post(
            f"/api/activities/{activity['id']}/logs",
            json={"date": value.isoformat()},
        )
        assert response.status_code == 201

    entry = client.get("/api/today").get_json()["activities"][0]
    assert entry["recentLogs"] == [today.isoformat()]
    assert entry["totalCompleted"] == 2
