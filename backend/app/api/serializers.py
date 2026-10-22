from __future__ import annotations

from datetime import date, datetime, timezone
from decimal import Decimal
from typing import Any

from app.models import (
    Activity,
    ActivityLog,
    ActivityProgressEntry,
    Genre,
    MeasurementUnit,
    MediaConsumptionEvent,
    MediaItem,
    MediaType,
    XpEvent,
)
from app.repositories.diary_file_store import DiaryDocument
from app.services.activity_stats import ActivityStats, MeasurableStats
from app.services.xp_service import CATEGORY_LABELS


def _iso_datetime(value: datetime) -> str:
    if value.tzinfo is None:
        value = value.replace(tzinfo=timezone.utc)
    value = value.astimezone(timezone.utc)
    return value.isoformat().replace("+00:00", "Z")


def _iso_date(value: date | None) -> str | None:
    return value.isoformat() if value is not None else None


def _number(value: Decimal | float | int | None) -> float | None:
    if value is None:
        return None
    return round(float(value), 4)


def serialize_unit(unit: MeasurementUnit | None) -> dict[str, Any] | None:
    if unit is None:
        return None
    return {
        "id": unit.id,
        "code": unit.code,
        "name": unit.name,
        "symbol": unit.symbol,
        "category": unit.category,
        "dimension": unit.dimension,
        "isSystem": unit.is_system,
    }


def serialize_stats(stats: ActivityStats | MeasurableStats) -> dict[str, Any]:
    base = {
        "totalCompleted": stats.total_completed,
        "currentStreak": stats.current_streak,
        "longestStreak": stats.longest_streak,
        "firstCompletedAt": _iso_date(stats.first_completed_at),
        "lastCompletedAt": _iso_date(stats.last_completed_at),
    }
    if isinstance(stats, MeasurableStats):
        base.update(
            {
                "totalAmount": _number(stats.total_amount),
                "todayAmount": _number(stats.today_amount),
                "currentPeriodStart": _iso_date(stats.current_period_start),
                "currentPeriodEnd": _iso_date(stats.current_period_end),
                "currentPeriodAmount": _number(stats.current_period_amount),
                "currentPeriodPercent": _number(stats.current_period_percent),
                "currentPeriodMet": stats.current_period_met,
                "weekAmount": _number(stats.week_amount),
                "monthAmount": _number(stats.month_amount),
                "averagePerRecordedDay": _number(stats.average_per_recorded_day),
                "recordedDays": stats.recorded_days,
                "entriesCount": stats.entries_count,
                "periodsMet": stats.periods_met,
                "daily": [
                    {
                        "date": _iso_date(item["date"]),
                        "amount": _number(item["amount"]),
                        "entries": item["entries"],
                        "goalMet": item["goal_met"],
                    }
                    for item in stats.daily
                ],
            }
        )
    return base


def serialize_activity(activity: Activity) -> dict[str, Any]:
    return {
        "id": activity.id,
        "name": activity.name,
        "description": activity.description,
        "category": activity.category,
        "color": activity.color,
        "kind": activity.kind,
        "frequency": activity.frequency,
        "unit": serialize_unit(activity.unit),
        "targetAmount": _number(activity.target_amount),
        "archived": activity.archived,
        "createdAt": _iso_datetime(activity.created_at),
        "updatedAt": _iso_datetime(activity.updated_at),
    }


def serialize_activity_with_stats(
    activity: Activity, stats: ActivityStats | MeasurableStats, recent_logs: list[date]
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


def serialize_progress_entry(entry: ActivityProgressEntry) -> dict[str, Any]:
    return {
        "id": entry.id,
        "activityId": entry.activity_id,
        "date": entry.entry_date.isoformat(),
        "amount": _number(entry.amount),
        "unit": serialize_unit(entry.unit),
        "note": entry.note,
        "createdAt": _iso_datetime(entry.created_at),
        "updatedAt": _iso_datetime(entry.updated_at),
    }


def serialize_xp_event(event: XpEvent) -> dict[str, Any]:
    return {
        "id": event.id,
        "source": event.source,
        "category": event.category,
        "categoryLabel": CATEGORY_LABELS.get(event.category, event.category),
        "kind": event.kind,
        "reason": event.reason,
        "description": event.description,
        "amount": event.amount,
        "activityDate": event.activity_date.isoformat(),
        "recordedAt": _iso_datetime(event.recorded_at),
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


def serialize_media_type(media_type: MediaType) -> dict[str, Any]:
    from app.services import media_service

    return {
        "id": media_type.id,
        "code": media_type.code,
        "name": media_type.name,
        "defaultUnit": media_type.default_unit,
        "unitLabel": media_type.unit_label,
        "units": list(media_service.allowed_units_for(media_type)),
        "isSystem": media_type.is_system,
    }


def serialize_genre(genre: Genre) -> dict[str, Any]:
    return {"id": genre.id, "name": genre.name}


def serialize_media_event(
    event: MediaConsumptionEvent, *, item: MediaItem | None = None
) -> dict[str, Any]:
    media_item = item or event.media_item
    time_kind = "unknown"
    estimated_minutes: float | None = None
    known_minutes: float | None = None
    if event.duration_minutes is not None:
        time_kind = "real"
        known_minutes = float(event.duration_minutes)
    elif event.unit == "minute":
        time_kind = "real"
        known_minutes = float(event.amount)
    elif event.unit == "hour":
        time_kind = "real"
        known_minutes = float(event.amount) * 60
    else:
        from app.services import media_service

        estimated = media_service.estimate_event_minutes(event, media_item)
        if estimated is not None:
            time_kind = "estimated"
            estimated_minutes = float(estimated)
            known_minutes = float(estimated)

    payload: dict[str, Any] = {
        "id": event.id,
        "mediaItemId": event.media_item_id,
        "date": event.consumed_on.isoformat(),
        "amount": _number(event.amount),
        "unit": event.unit,
        "unitLabel": media_service_unit_label(media_item, event.unit),
        "durationMinutes": _number(event.duration_minutes),
        "estimatedMinutes": estimated_minutes,
        "knownMinutes": known_minutes,
        "timeKind": time_kind,
        "note": event.note,
        "isRepeat": event.is_repeat,
        "createdAt": _iso_datetime(event.created_at),
        "updatedAt": _iso_datetime(event.updated_at),
    }
    if item is None:
        payload["item"] = {
            "id": media_item.id,
            "title": media_item.title,
            "type": serialize_media_type(media_item.media_type),
        }
    return payload


def media_service_unit_label(item: MediaItem, unit: str) -> str:
    from app.services import media_service

    return media_service.unit_label(item, unit)


def serialize_media_item(
    item: MediaItem,
    *,
    aggregates: dict[str, Any] | None = None,
    include_events: bool = False,
) -> dict[str, Any]:
    payload: dict[str, Any] = {
        "id": item.id,
        "title": item.title,
        "alternateTitle": item.alternate_title,
        "description": item.description,
        "releaseYear": item.release_year,
        "creator": item.creator,
        "type": serialize_media_type(item.media_type),
        "genres": [genre.name for genre in item.genres],
        "totalUnits": item.total_units,
        "totalVolumes": item.total_volumes,
        "averageDurationMinutes": item.average_duration_minutes,
        "totalDurationMinutes": item.total_duration_minutes,
        "unitLabel": item.unit_label,
        "rating": item.rating,
        "notes": item.notes,
        "status": item.status,
        "startedOn": _iso_date(item.started_on),
        "finishedOn": _iso_date(item.finished_on),
        "archived": item.archived,
        "progressOverride": _number(item.progress_override),
        "createdAt": _iso_datetime(item.created_at),
        "updatedAt": _iso_datetime(item.updated_at),
    }
    if aggregates is not None:
        payload.update(aggregates)
    if include_events:
        payload["events"] = [
            serialize_media_event(event, item=item) for event in item.events
        ]
    return payload
