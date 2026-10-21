from __future__ import annotations

from dataclasses import dataclass
from datetime import date, datetime, timedelta
from typing import Any, Iterable

from app.core.errors import ConflictError, NotFoundError, ValidationError
from app.models import Activity, ActivityLog
from app.repositories import activity_repository as repository

VALID_COLORS = {"purple", "magenta", "red", "green", "blue", "yellow", "orange"}
DATE_FORMAT = "%Y-%m-%d"
RECENT_DAYS = 84


@dataclass(frozen=True)
class ActivityStats:
    total_completed: int
    current_streak: int
    longest_streak: int
    first_completed_at: date | None
    last_completed_at: date | None


def parse_date(value: Any, field: str = "date") -> date:
    if not isinstance(value, str):
        raise ValidationError(
            "Informe uma data válida.", {"fields": {field: "Use o formato AAAA-MM-DD."}}
        )
    try:
        return datetime.strptime(value, DATE_FORMAT).date()
    except ValueError as error:
        raise ValidationError(
            "Data inválida.", {"fields": {field: "Use o formato AAAA-MM-DD."}}
        ) from error


def compute_stats(dates: Iterable[date], today: date | None = None) -> ActivityStats:
    current_day = today or date.today()
    ordered = sorted(set(dates))
    if not ordered:
        return ActivityStats(0, 0, 0, None, None)

    longest = 1
    running = 1
    for previous, current in zip(ordered, ordered[1:]):
        if (current - previous).days == 1:
            running += 1
            longest = max(longest, running)
        else:
            running = 1

    lookup = set(ordered)
    cursor = current_day if current_day in lookup else current_day - timedelta(days=1)
    current_streak = 0
    while cursor in lookup:
        current_streak += 1
        cursor -= timedelta(days=1)

    return ActivityStats(
        total_completed=len(ordered),
        current_streak=current_streak,
        longest_streak=longest,
        first_completed_at=ordered[0],
        last_completed_at=ordered[-1],
    )


def _validate_payload(
    payload: Any, *, partial: bool = False
) -> dict[str, Any]:
    if not isinstance(payload, dict):
        raise ValidationError("Envie um objeto JSON válido.")

    fields: dict[str, str] = {}
    cleaned: dict[str, Any] = {}

    if not partial or "name" in payload:
        name = payload.get("name")
        if not isinstance(name, str) or not name.strip():
            fields["name"] = "Informe um nome para a atividade."
        elif len(name.strip()) < 2:
            fields["name"] = "Use pelo menos 2 caracteres."
        elif len(name.strip()) > 80:
            fields["name"] = "Use no máximo 80 caracteres."
        else:
            cleaned["name"] = name.strip()

    if not partial or "description" in payload:
        description = payload.get("description")
        if description is None:
            cleaned["description"] = None
        elif not isinstance(description, str):
            fields["description"] = "A descrição deve ser um texto."
        elif len(description.strip()) > 500:
            fields["description"] = "Use no máximo 500 caracteres."
        else:
            cleaned["description"] = description.strip() or None

    if not partial or "category" in payload:
        category = payload.get("category")
        if not isinstance(category, str) or not category.strip():
            fields["category"] = "Informe uma categoria."
        elif len(category.strip()) > 40:
            fields["category"] = "Use no máximo 40 caracteres."
        else:
            cleaned["category"] = category.strip()

    if not partial or "color" in payload:
        color = payload.get("color")
        if not isinstance(color, str) or color not in VALID_COLORS:
            fields["color"] = "Escolha uma cor válida."

        else:
            cleaned["color"] = color

    if fields:
        raise ValidationError("Revise os campos informados.", {"fields": fields})

    return cleaned


def _require_activity(activity_id: int) -> Activity:
    activity = repository.get_activity(activity_id)
    if activity is None:
        raise NotFoundError("Atividade não encontrada.")
    return activity


def list_activities() -> list[dict[str, Any]]:
    activities = repository.list_activities()
    logs_by_activity: dict[int, list[date]] = {}
    for log in repository.list_all_logs():
        logs_by_activity.setdefault(log.activity_id, []).append(log.date)

    cutoff = date.today() - timedelta(days=RECENT_DAYS)
    results: list[dict[str, Any]] = []
    for activity in activities:
        dates = logs_by_activity.get(activity.id, [])
        results.append(
            {
                "activity": activity,
                "stats": compute_stats(dates),
                "recent_logs": sorted(item for item in dates if item >= cutoff),
            }
        )
    return results


def get_activity(activity_id: int) -> Activity:
    return _require_activity(activity_id)


def create_activity(payload: Any) -> Activity:
    cleaned = _validate_payload(payload)
    activity = Activity(**cleaned)
    repository.add_activity(activity)
    repository.commit()
    return activity


def update_activity(activity_id: int, payload: Any) -> Activity:
    activity = _require_activity(activity_id)
    cleaned = _validate_payload(payload, partial=True)
    for key, value in cleaned.items():
        setattr(activity, key, value)
    repository.commit()
    return activity


def delete_activity(activity_id: int) -> None:
    activity = _require_activity(activity_id)
    repository.delete_activity(activity)
    repository.commit()


def _log_dates(activity_id: int) -> list[date]:
    return repository.list_log_dates(activity_id)


def register_log(activity_id: int, payload: Any) -> tuple[ActivityLog, ActivityStats]:
    _require_activity(activity_id)

    if not isinstance(payload, dict):
        raise ValidationError("Envie um objeto JSON válido.")

    log_date = parse_date(payload.get("date"))
    if log_date > date.today():
        raise ValidationError(
            "Não é possível registrar uma data futura.",
            {"fields": {"date": "Escolha uma data até hoje."}},
        )

    if repository.get_log(activity_id, log_date) is not None:
        raise ConflictError("Este dia já está registrado para esta atividade.")

    log = ActivityLog(activity_id=activity_id, date=log_date)
    repository.add_log(log)
    repository.commit()
    return log, compute_stats(_log_dates(activity_id))


def remove_log(activity_id: int, raw_date: Any) -> None:
    _require_activity(activity_id)
    log_date = parse_date(raw_date)
    log = repository.get_log(activity_id, log_date)
    if log is None:
        raise NotFoundError("Registro não encontrado.")
    repository.delete_log(log)
    repository.commit()


def get_history(activity_id: int, start_raw: Any, end_raw: Any) -> dict[str, Any]:
    from flask import current_app

    activity = _require_activity(activity_id)
    today = date.today()

    end = parse_date(end_raw, "end") if end_raw is not None else today
    start = (
        parse_date(start_raw, "start")
        if start_raw is not None
        else end - timedelta(days=364)
    )

    if start > end:
        raise ValidationError(
            "O início do período deve ser anterior ao fim.",
            {"fields": {"start": "Data inicial posterior à final."}},
        )

    max_days = current_app.config.get("MAX_HISTORY_DAYS", 800)
    if (end - start).days > max_days:
        raise ValidationError(
            f"O período máximo permitido é de {max_days} dias.",
            {"fields": {"start": "Reduza o intervalo consultado."}},
        )

    logs = repository.list_logs(activity_id, start, end)
    stats = compute_stats(_log_dates(activity_id))
    return {
        "activity": activity,
        "logs": logs,
        "stats": stats,
        "range": {"start": start, "end": end},
    }


def get_today_summary() -> dict[str, Any]:
    today = date.today()
    activities = repository.list_activities()
    logs_by_activity: dict[int, list[date]] = {}
    for log in repository.list_all_logs():
        logs_by_activity.setdefault(log.activity_id, []).append(log.date)

    cutoff = today - timedelta(days=RECENT_DAYS)
    entries = []
    for activity in activities:
        dates = logs_by_activity.get(activity.id, [])
        stats = compute_stats(dates, today=today)
        entries.append(
            {
                "activity": activity,
                "completed_today": today in set(dates),
                "recent_logs": sorted(item for item in dates if item >= cutoff),
                "stats": stats,
            }
        )

    return {"date": today, "activities": entries}
