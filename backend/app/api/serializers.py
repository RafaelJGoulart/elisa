from __future__ import annotations

from datetime import date, datetime, timezone
from typing import Any

from app.models import Activity, ActivityLog
from app.repositories.diary_file_store import DiaryDocument
from app.services.activity_service import ActivityStats


def _iso_datetime(value: datetime) -> str:
    if value.tzinfo is None:
        value = value.replace(tzinfo=timezone.utc)
    value = value.astimezone(timezone.utc)
    return value.isoformat().replace("+00:00", "Z")


def _iso_date(value: date | None) -> str | None:
    return value.isoformat() if value is not None else None


def serialize_stats(stats: ActivityStats) -> dict[str, Any]:
    return {
        "totalCompleted": stats.total_completed,
        "currentStreak": stats.current_streak,
        "longestStreak": stats.longest_streak,
        "firstCompletedAt": _iso_date(stats.first_completed_at),
        "lastCompletedAt": _iso_date(stats.last_completed_at),
    }


def serialize_activity(activity: Activity) -> dict[str, Any]:
    return {
        "id": activity.id,
        "name": activity.name,
        "description": activity.description,
        "category": activity.category,
        "color": activity.color,
        "createdAt": _iso_datetime(activity.created_at),
        "updatedAt": _iso_datetime(activity.updated_at),
    }


def serialize_activity_with_stats(
    activity: Activity, stats: ActivityStats, recent_logs: list[date]
) -> dict[str, Any]:
    return {
        **serialize_activity(activity),
        "stats": serialize_stats(stats),
        "recentLogs": [value.isoformat() for value in recent_logs],
    }


def serialize_log(log: ActivityLog) -> dict[str, Any]:
    return {
        "date": log.date.isoformat(),
        "createdAt": _iso_datetime(log.created_at),
    }


def serialize_diary_entry(
    document: DiaryDocument, *, include_content: bool = False
) -> dict[str, Any]:
    payload: dict[str, Any] = {
        "id": document.id,
        "title": document.title,
        "tags": document.tags,
        "createdAt": _iso_datetime(document.created_at),
        "updatedAt": _iso_datetime(document.updated_at),
    }
    if include_content:
        payload["content"] = document.content
    return payload


def serialize_diary_summary(document: DiaryDocument, excerpt: str) -> dict[str, Any]:
    return {**serialize_diary_entry(document), "excerpt": excerpt}
