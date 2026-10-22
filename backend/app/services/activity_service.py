from __future__ import annotations

from datetime import date, timedelta
from decimal import Decimal
from typing import Any, Iterable

from app.core.errors import ConflictError, NotFoundError, ValidationError
from app.models import Activity, ActivityLog, ActivityProgressEntry
from app.repositories import activity_repository as repository
from app.services import measurement_service, xp_service
from app.services.activity_stats import (
    ActivityStats,
    MeasurableStats,
    compute_measurable_stats,
    compute_stats,
    period_bounds,
)
from app.services.activity_validation import (
    parse_date,
    require_measurable,
    validate_payload,
    validate_progress_payload,
)

RECENT_DAYS = 84


def stats_for_activity(
    activity: Activity, entries: Iterable[ActivityProgressEntry]
) -> ActivityStats | MeasurableStats:
    if activity.kind == "measurable":
        return compute_measurable_stats(activity, entries)
    return compute_stats(repository.list_log_dates(activity.id))


def _require_activity(activity_id: int) -> Activity:
    activity = repository.get_activity(activity_id)
    if activity is None:
        raise NotFoundError("Atividade não encontrada.")
    return activity


def _recent_completion_dates(
    activity: Activity, stats: ActivityStats | MeasurableStats, cutoff: date
) -> list[date]:
    if isinstance(stats, ActivityStats):
        return [item for item in repository.list_log_dates(activity.id) if item >= cutoff]
    if activity.frequency == "daily":
        return [
            item["date"]
            for item in stats.daily
            if item["goal_met"] and item["date"] >= cutoff
        ]
    return [item["date"] for item in stats.daily if item["date"] >= cutoff]


def list_activities(include_archived: bool = False) -> list[dict[str, Any]]:
    activities = repository.list_activities(include_archived=include_archived)
    entries_by_activity: dict[int, list[ActivityProgressEntry]] = {}
    for entry in repository.list_all_progress_entries():
        entries_by_activity.setdefault(entry.activity_id, []).append(entry)

    cutoff = date.today() - timedelta(days=RECENT_DAYS)
    results: list[dict[str, Any]] = []
    for activity in activities:
        if activity.kind == "measurable":
            stats = compute_measurable_stats(
                activity, entries_by_activity.get(activity.id, [])
            )
        else:
            stats = compute_stats(repository.list_log_dates(activity.id))
        results.append(
            {
                "activity": activity,
                "stats": stats,
                "recent_logs": _recent_completion_dates(activity, stats, cutoff),
            }
        )
    return results


def get_activity(activity_id: int) -> Activity:
    return _require_activity(activity_id)


def create_activity(payload: Any) -> Activity:
    cleaned = validate_payload(payload)
    activity = Activity(**cleaned)
    repository.add_activity(activity)
    repository.commit()
    return activity


def update_activity(activity_id: int, payload: Any) -> Activity:
    activity = _require_activity(activity_id)
    cleaned = validate_payload(payload, partial=True, current=activity)

    if activity.kind == "measurable" and cleaned.get("kind") == "binary":
        if repository.list_progress_entries(activity.id):
            raise ValidationError(
                "Exclua os registros quantitativos antes de converter em hábito binário.",
                {
                    "fields": {
                        "kind": "Há registros de progresso que seriam perdidos."
                    }
                },
            )

    if activity.kind == "binary" and cleaned.get("kind") == "measurable":
        if repository.list_log_dates(activity.id):
            raise ValidationError(
                "Exclua as conclusões diárias antes de converter em hábito mensurável.",
                {"fields": {"kind": "Há conclusões que não podem ser convertidas."}},
            )

    new_unit_id = cleaned.get("unit_id", activity.unit_id)
    if (
        activity.unit is not None
        and new_unit_id is not None
        and new_unit_id != activity.unit_id
        and activity.target_amount is not None
        and "target_amount" not in cleaned
    ):
        new_unit = repository.get_unit(new_unit_id)
        if new_unit is not None:
            # A meta é expressa na unidade do hábito. Ao trocar entre unidades
            # compatíveis, convertemos o valor para manter o mesmo objetivo.
            cleaned["target_amount"] = measurement_service.convert_amount(
                Decimal(str(activity.target_amount)), activity.unit, new_unit
            )

    for key, value in cleaned.items():
        setattr(activity, key, value)
    repository.flush()
    xp_service.sync_activity(activity.id)
    repository.commit()
    return activity


def delete_activity(activity_id: int) -> None:
    activity = _require_activity(activity_id)
    xp_service.revoke_activity(activity.id)
    repository.delete_activity(activity)
    repository.commit()


def register_log(activity_id: int, payload: Any) -> tuple[ActivityLog, ActivityStats]:
    activity = _require_activity(activity_id)
    if activity.kind == "measurable":
        raise ValidationError(
            "Registre a quantidade realizada em vez de marcar conclusão.",
            {"fields": {"kind": "Este hábito é mensurável."}},
        )

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
    repository.flush()
    xp_service.sync_activity(activity_id)
    repository.commit()
    return log, compute_stats(repository.list_log_dates(activity_id))


def remove_log(activity_id: int, raw_date: Any) -> None:
    activity = _require_activity(activity_id)
    if activity.kind == "measurable":
        raise ValidationError(
            "Este hábito usa registros quantitativos.",
            {"fields": {"kind": "Exclua o registro de progresso correspondente."}},
        )
    log_date = parse_date(raw_date)
    log = repository.get_log(activity_id, log_date)
    if log is None:
        raise NotFoundError("Registro não encontrado.")
    repository.delete_log(log)
    repository.flush()
    xp_service.sync_activity(activity_id)
    repository.commit()


def register_progress(
    activity_id: int, payload: Any
) -> tuple[ActivityProgressEntry, MeasurableStats]:
    activity = _require_activity(activity_id)
    cleaned = validate_progress_payload(activity, payload)
    entry = ActivityProgressEntry(activity_id=activity_id, **cleaned)
    repository.add_progress_entry(entry)
    repository.flush()
    xp_service.sync_activity(activity_id)
    repository.commit()
    stats = compute_measurable_stats(
        activity, repository.list_progress_entries(activity_id)
    )
    return entry, stats


def update_progress(
    activity_id: int, entry_id: int, payload: Any
) -> tuple[ActivityProgressEntry, MeasurableStats]:
    activity = _require_activity(activity_id)
    entry = repository.get_progress_entry(activity_id, entry_id)
    if entry is None:
        raise NotFoundError("Registro de progresso não encontrado.")
    cleaned = validate_progress_payload(activity, payload, current=entry)
    for key, value in cleaned.items():
        setattr(entry, key, value)
    repository.flush()
    xp_service.sync_activity(activity_id)
    repository.commit()
    stats = compute_measurable_stats(
        activity, repository.list_progress_entries(activity_id)
    )
    return entry, stats


def remove_progress(activity_id: int, entry_id: int) -> None:
    activity = _require_activity(activity_id)
    require_measurable(activity)
    entry = repository.get_progress_entry(activity_id, entry_id)
    if entry is None:
        raise NotFoundError("Registro de progresso não encontrado.")
    repository.delete_progress_entry(entry)
    repository.flush()
    xp_service.sync_activity(activity_id)
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

    logs: list[ActivityLog] = []
    progress_entries: list[ActivityProgressEntry] = []
    completion_dates: list[date] = []

    if activity.kind == "measurable":
        progress_entries = repository.list_progress_entries(activity_id, start, end)
        stats = compute_measurable_stats(
            activity, repository.list_progress_entries(activity_id), today=today
        )
        if activity.frequency == "daily":
            completion_dates = [
                item["date"]
                for item in stats.daily
                if item["goal_met"] and start <= item["date"] <= end
            ]
        else:
            completion_dates = [entry.entry_date for entry in progress_entries]
    else:
        logs = repository.list_logs(activity_id, start, end)
        stats = compute_stats(repository.list_log_dates(activity_id), today=today)
        completion_dates = [log.date for log in logs]

    return {
        "activity": activity,
        "logs": logs,
        "progress_entries": progress_entries,
        "completion_dates": sorted(set(completion_dates)),
        "stats": stats,
        "range": {"start": start, "end": end},
    }


def get_today_summary() -> dict[str, Any]:
    today = date.today()
    activities = repository.list_activities()
    entries_by_activity: dict[int, list[ActivityProgressEntry]] = {}
    for entry in repository.list_all_progress_entries():
        entries_by_activity.setdefault(entry.activity_id, []).append(entry)

    cutoff = today - timedelta(days=RECENT_DAYS)
    entries = []
    for activity in activities:
        if activity.kind == "measurable":
            stats = compute_measurable_stats(
                activity, entries_by_activity.get(activity.id, []), today=today
            )
            completed_today = stats.current_period_met
        else:
            stats = compute_stats(repository.list_log_dates(activity.id), today=today)
            completed_today = today in set(repository.list_log_dates(activity.id))

        entries.append(
            {
                "activity": activity,
                "completed_today": completed_today,
                "recent_logs": _recent_completion_dates(activity, stats, cutoff),
                "stats": stats,
            }
        )

    return {"date": today, "activities": entries}
