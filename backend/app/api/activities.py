from __future__ import annotations

from typing import Any

from flask import Blueprint, jsonify, request

from app.api.serializers import (
    serialize_activity,
    serialize_activity_with_stats,
    serialize_log,
    serialize_stats,
)
from app.core.errors import ValidationError
from app.services import activity_service

activities_bp = Blueprint("activities", __name__, url_prefix="/api")


def _json_body() -> dict[str, Any]:
    payload = request.get_json(silent=True)
    if payload is None:
        raise ValidationError(
            "Envie um corpo JSON com Content-Type application/json."
        )
    return payload


@activities_bp.get("/activities")
def list_activities():
    rows = activity_service.list_activities()
    return jsonify(
        {
            "activities": [
                serialize_activity_with_stats(
                    row["activity"], row["stats"], row["recent_logs"]
                )
                for row in rows
            ]
        }
    )


@activities_bp.post("/activities")
def create_activity():
    activity = activity_service.create_activity(_json_body())
    return jsonify({"activity": serialize_activity(activity)}), 201


@activities_bp.get("/activities/<int:activity_id>")
def get_activity(activity_id: int):
    activity = activity_service.get_activity(activity_id)
    return jsonify({"activity": serialize_activity(activity)})


@activities_bp.patch("/activities/<int:activity_id>")
def update_activity(activity_id: int):
    activity = activity_service.update_activity(activity_id, _json_body())
    return jsonify({"activity": serialize_activity(activity)})


@activities_bp.delete("/activities/<int:activity_id>")
def delete_activity(activity_id: int):
    activity_service.delete_activity(activity_id)
    return "", 204


@activities_bp.get("/activities/<int:activity_id>/history")
def get_history(activity_id: int):
    history = activity_service.get_history(
        activity_id,
        request.args.get("start"),
        request.args.get("end"),
    )
    return jsonify(
        {
            "activity": serialize_activity(history["activity"]),
            "logs": [serialize_log(log) for log in history["logs"]],
            "stats": serialize_stats(history["stats"]),
            "range": {
                "start": history["range"]["start"].isoformat(),
                "end": history["range"]["end"].isoformat(),
            },
        }
    )


@activities_bp.post("/activities/<int:activity_id>/logs")
def create_log(activity_id: int):
    log, stats = activity_service.register_log(activity_id, _json_body())
    return (
        jsonify({"log": serialize_log(log), "stats": serialize_stats(stats)}),
        201,
    )


@activities_bp.delete("/activities/<int:activity_id>/logs/<log_date>")
def delete_log(activity_id: int, log_date: str):
    activity_service.remove_log(activity_id, log_date)
    return "", 204


@activities_bp.get("/today")
def get_today():
    summary = activity_service.get_today_summary()
    return jsonify(
        {
            "date": summary["date"].isoformat(),
            "activities": [
                {
                    "activity": serialize_activity(entry["activity"]),
                    "completedToday": entry["completed_today"],
                    "currentStreak": entry["stats"].current_streak,
                    "totalCompleted": entry["stats"].total_completed,
                    "recentLogs": [item.isoformat() for item in entry["recent_logs"]],
                }
                for entry in summary["activities"]
            ],
        }
    )
