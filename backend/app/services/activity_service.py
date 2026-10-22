from __future__ import annotations

from dataclasses import dataclass, field
from datetime import date, datetime, timedelta
from decimal import Decimal, ROUND_HALF_UP
from typing import Any, Iterable

from app.core.errors import ConflictError, NotFoundError, ValidationError
from app.models import Activity, ActivityLog, ActivityProgressEntry, MeasurementUnit
from app.repositories import activity_repository as repository
from app.services import measurement_service

VALID_COLORS = {"purple", "magenta", "red", "green", "blue", "yellow", "orange"}
VALID_KINDS = {"binary", "measurable"}
VALID_FREQUENCIES = {"daily", "weekly", "monthly"}
DATE_FORMAT = "%Y-%m-%d"
RECENT_DAYS = 84
PERCENT_QUANTIZE = Decimal("0.01")


@dataclass(frozen=True)
class ActivityStats:
    total_completed: int
    current_streak: int
    longest_streak: int
    first_completed_at: date | None
    last_completed_at: date | None


@dataclass(frozen=True)
class MeasurableStats:
    total_completed: int
    current_streak: int
    longest_streak: int
    first_completed_at: date | None
    last_completed_at: date | None
    total_amount: Decimal
    today_amount: Decimal
    current_period_start: date
    current_period_end: date
    current_period_amount: Decimal
    current_period_percent: Decimal | None
    current_period_met: bool
    week_amount: Decimal
    month_amount: Decimal
    average_per_recorded_day: Decimal
    recorded_days: int
    entries_count: int
    periods_met: int
    daily: tuple[dict[str, Any], ...] = field(default_factory=tuple)


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


def _period_bounds(day: date, frequency: str) -> tuple[date, date]:
    if frequency == "daily":
        return day, day
    if frequency == "weekly":
        start = day - timedelta(days=(day.weekday() + 1) % 7)
        return start, start + timedelta(days=6)
    start = day.replace(day=1)
    next_month = (start.replace(day=28) + timedelta(days=4)).replace(day=1)
    return start, next_month - timedelta(days=1)


def _period_start(day: date, frequency: str) -> date:
    return _period_bounds(day, frequency)[0]


def _shift_period(start: date, frequency: str, direction: int = -1) -> date:
    if frequency == "daily":
        return start + timedelta(days=direction)
    if frequency == "weekly":
        return start + timedelta(days=7 * direction)
    if direction < 0:
        previous_month_end = start - timedelta(days=1)
        return previous_month_end.replace(day=1)
    next_month = (start.replace(day=28) + timedelta(days=4)).replace(day=1)
    return next_month


def _entry_amount(entry: ActivityProgressEntry, target_unit: MeasurementUnit) -> Decimal:
    return measurement_service.convert_amount(
        Decimal(str(entry.amount)), entry.unit, target_unit
    )


def _percent(amount: Decimal, target: Decimal) -> Decimal:
    return (amount / target * Decimal("100")).quantize(
        PERCENT_QUANTIZE, rounding=ROUND_HALF_UP
    )


def compute_measurable_stats(
    activity: Activity,
    entries: Iterable[ActivityProgressEntry],
    today: date | None = None,
) -> MeasurableStats:
    current_day = today or date.today()
    unit = activity.unit
    if unit is None:
        raise ValidationError("O hábito mensurável precisa de uma unidade de medida.")

    frequency = activity.frequency
    target = Decimal(str(activity.target_amount)) if activity.target_amount is not None else None

    daily_totals: dict[date, Decimal] = {}
    entries_by_day: dict[date, int] = {}
    ordered_entries = sorted(entries, key=lambda item: (item.entry_date, item.id))
    for entry in ordered_entries:
        amount = _entry_amount(entry, unit)
        daily_totals[entry.entry_date] = daily_totals.get(entry.entry_date, Decimal("0")) + amount
        entries_by_day[entry.entry_date] = entries_by_day.get(entry.entry_date, 0) + 1

    daily_history: list[dict[str, Any]] = []
    for day in sorted(daily_totals):
        amount = daily_totals[day]
        daily_history.append(
            {
                "date": day,
                "amount": amount,
                "entries": entries_by_day.get(day, 0),
                "goal_met": amount >= target if target is not None else amount > 0,
            }
        )

    period_totals: dict[date, Decimal] = {}
    for day, amount in daily_totals.items():
        key = _period_start(day, frequency)
        period_totals[key] = period_totals.get(key, Decimal("0")) + amount

    met_periods = {
        key
        for key, amount in period_totals.items()
        if (amount >= target if target is not None else amount > 0)
    }

    total_amount = sum(daily_totals.values(), Decimal("0"))
    recorded_days = len(daily_totals)
    average = (
        (total_amount / recorded_days).quantize(Decimal("0.0001"), rounding=ROUND_HALF_UP)
        if recorded_days
        else Decimal("0")
    )

    current_start, current_end = _period_bounds(current_day, frequency)
    current_amount = period_totals.get(current_start, Decimal("0"))
    current_met = current_start in met_periods
    current_percent = _percent(current_amount, target) if target is not None else None

    week_start, week_end = _period_bounds(current_day, "weekly")
    month_start, month_end = _period_bounds(current_day, "monthly")
    week_amount = sum(
        (
            amount
            for day, amount in daily_totals.items()
            if week_start <= day <= week_end
        ),
        Decimal("0"),
    )
    month_amount = sum(
        (
            amount
            for day, amount in daily_totals.items()
            if month_start <= day <= month_end
        ),
        Decimal("0"),
    )

    cursor = current_start if current_start in met_periods else _shift_period(current_start, frequency)
    current_streak = 0
    while cursor in met_periods:
        current_streak += 1
        cursor = _shift_period(cursor, frequency)

    ordered_periods = sorted(met_periods)
    longest = 1 if ordered_periods else 0
    running = 1
    for previous, current in zip(ordered_periods, ordered_periods[1:]):
        if _shift_period(previous, frequency, direction=1) == current:
            running += 1
            longest = max(longest, running)
        else:
            running = 1

    if frequency == "daily":
        met_dates = [item["date"] for item in daily_history if item["goal_met"]]
        total_completed = len(met_dates)
        # Dias em que a meta foi atingida também são períodos cumpridos.
        periods_met = total_completed
    else:
        met_dates = sorted(met_periods)
        total_completed = len(met_periods)
        periods_met = len(met_periods)

    return MeasurableStats(
        total_completed=total_completed,
        current_streak=current_streak,
        longest_streak=longest,
        first_completed_at=met_dates[0] if met_dates else None,
        last_completed_at=met_dates[-1] if met_dates else None,
        total_amount=total_amount,
        today_amount=daily_totals.get(current_day, Decimal("0")),
        current_period_start=current_start,
        current_period_end=current_end,
        current_period_amount=current_amount,
        current_period_percent=current_percent,
        current_period_met=current_met,
        week_amount=week_amount,
        month_amount=month_amount,
        average_per_recorded_day=average,
        recorded_days=recorded_days,
        entries_count=len(ordered_entries),
        periods_met=periods_met,
        daily=tuple(daily_history),
    )


def stats_for_activity(
    activity: Activity, entries: Iterable[ActivityProgressEntry]
) -> ActivityStats | MeasurableStats:
    if activity.kind == "measurable":
        return compute_measurable_stats(activity, entries)
    return compute_stats(repository.list_log_dates(activity.id))


def _parse_unit_id(value: Any, field: str = "unitId") -> int:
    if isinstance(value, bool) or not isinstance(value, int) or value <= 0:
        raise ValidationError(
            "Escolha uma unidade válida.",
            {"fields": {field: "Informe o identificador de uma unidade existente."}},
        )
    return value


def _parse_optional_target(value: Any) -> Decimal | None:
    if value is None:
        return None
    return measurement_service.parse_amount(value, field="targetAmount")


def _validate_payload(
    payload: Any, *, partial: bool = False, current: Activity | None = None
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

    if not partial or "kind" in payload:
        kind = payload.get("kind", "binary" if current is None else current.kind)
        if not isinstance(kind, str) or kind not in VALID_KINDS:
            fields["kind"] = "Escolha um tipo de hábito válido."
        else:
            cleaned["kind"] = kind

    if not partial or "frequency" in payload:
        frequency = payload.get(
            "frequency", "daily" if current is None else current.frequency
        )
        if not isinstance(frequency, str) or frequency not in VALID_FREQUENCIES:
            fields["frequency"] = "Escolha uma frequência válida."
        else:
            cleaned["frequency"] = frequency

    if not partial or "unitId" in payload:
        unit_value = payload.get("unitId")
        if unit_value is None:
            cleaned["unit_id"] = None
        else:
            cleaned["unit_id"] = _parse_unit_id(unit_value)

    if not partial or "targetAmount" in payload:
        try:
            cleaned["target_amount"] = _parse_optional_target(
                payload.get("targetAmount")
            )
        except ValidationError as error:
            if error.details and "fields" in error.details:
                fields.update(error.details["fields"])
            else:
                fields["targetAmount"] = error.message

    if not partial or "archived" in payload:
        archived = payload.get("archived", False if current is None else current.archived)
        if not isinstance(archived, bool):
            fields["archived"] = "Use verdadeiro ou falso."
        else:
            cleaned["archived"] = archived

    if fields:
        raise ValidationError("Revise os campos informados.", {"fields": fields})

    resulting_kind = cleaned.get("kind", current.kind if current else "binary")
    resulting_frequency = cleaned.get(
        "frequency", current.frequency if current else "daily"
    )
    resulting_unit_id = cleaned.get(
        "unit_id", current.unit_id if current else None
    )
    resulting_target = cleaned.get(
        "target_amount", current.target_amount if current else None
    )

    if resulting_kind == "measurable":
        if resulting_unit_id is None:
            fields["unitId"] = "Escolha a unidade de medida do hábito."
        if resulting_frequency not in VALID_FREQUENCIES:
            fields["frequency"] = "Escolha uma frequência válida."
    else:
        # Hábito binário mantém o comportamento histórico: conclusão por dia.
        if "unit_id" in cleaned and resulting_unit_id is not None:
            fields["unitId"] = "Hábitos binários não usam unidade de medida."
        if "target_amount" in cleaned and resulting_target is not None:
            fields["targetAmount"] = "Hábitos binários não usam meta quantitativa."
        if "frequency" in cleaned and resulting_frequency != "daily":
            fields["frequency"] = "Hábitos binários usam frequência diária."
        if current is None:
            cleaned["unit_id"] = None
            cleaned["target_amount"] = None
            cleaned["frequency"] = "daily"
        elif cleaned.get("kind") == "binary":
            cleaned["unit_id"] = None
            cleaned["target_amount"] = None
            cleaned["frequency"] = "daily"

    if fields:
        raise ValidationError("Revise os campos informados.", {"fields": fields})

    if resulting_kind == "measurable" and resulting_unit_id is not None:
        measurement_service.ensure_default_units()
        unit = repository.get_unit(resulting_unit_id)
        if unit is None:
            fields["unitId"] = "Selecione uma unidade existente."
        elif (
            current is not None
            and current.unit is not None
            and current.unit_id != resulting_unit_id
            and repository.list_progress_entries(current.id)
        ):
            if current.unit.dimension != unit.dimension:
                fields["unitId"] = (
                    "Não é possível trocar para uma unidade incompatível enquanto "
                    "houver registros. Exclua os registros antes de mudar a grandeza."
                )
        if fields:
            raise ValidationError("Revise os campos informados.", {"fields": fields})

    return cleaned


def _require_activity(activity_id: int) -> Activity:
    activity = repository.get_activity(activity_id)
    if activity is None:
        raise NotFoundError("Atividade não encontrada.")
    return activity


def _require_measurable(activity: Activity) -> None:
    if activity.kind != "measurable":
        raise ValidationError(
            "Esta atividade é binária. Use o registro de conclusão diária.",
            {"fields": {"kind": "Hábitos binários não recebem quantidades."}},
        )


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
    cleaned = _validate_payload(payload)
    activity = Activity(**cleaned)
    repository.add_activity(activity)
    repository.commit()
    return activity


def update_activity(activity_id: int, payload: Any) -> Activity:
    activity = _require_activity(activity_id)
    cleaned = _validate_payload(payload, partial=True, current=activity)

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
    repository.commit()
    return activity


def delete_activity(activity_id: int) -> None:
    activity = _require_activity(activity_id)
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
    repository.commit()


def _validate_progress_payload(
    activity: Activity,
    payload: Any,
    *,
    current: ActivityProgressEntry | None = None,
) -> dict[str, Any]:
    _require_measurable(activity)
    if not isinstance(payload, dict):
        raise ValidationError("Envie um objeto JSON válido.")
    if activity.unit is None:
        raise ValidationError("O hábito não possui unidade de medida.")

    fields: dict[str, str] = {}
    cleaned: dict[str, Any] = {}

    raw_date = payload.get("date", current.entry_date.isoformat() if current else None)
    try:
        entry_date = parse_date(raw_date)
    except ValidationError as error:
        fields.update(error.details["fields"] if error.details else {})
        entry_date = None
    if entry_date is not None:
        if entry_date > date.today():
            fields["date"] = "Escolha uma data até hoje."
        else:
            cleaned["entry_date"] = entry_date

    raw_amount = payload.get("amount", current.amount if current else None)
    try:
        amount = measurement_service.parse_amount(raw_amount)
        cleaned["amount"] = amount
    except ValidationError as error:
        fields.update(error.details["fields"] if error.details else {})

    raw_unit = payload.get("unitId")
    if raw_unit is None:
        unit = current.unit if current is not None else activity.unit
    else:
        try:
            unit = measurement_service.get_unit(_parse_unit_id(raw_unit))
        except (ValidationError, NotFoundError) as error:
            fields["unitId"] = error.message
            unit = None

    if unit is not None:
        try:
            measurement_service.convert_amount(Decimal("1"), unit, activity.unit)
        except ValidationError:
            fields["unitId"] = (
                f"A unidade {unit.symbol} não é compatível com {activity.unit.symbol}."
            )
        else:
            cleaned["unit_id"] = unit.id

    if "note" in payload:
        note = payload.get("note")
        if note is None:
            cleaned["note"] = None
        elif not isinstance(note, str):
            fields["note"] = "A observação deve ser um texto."
        elif len(note.strip()) > 500:
            fields["note"] = "Use no máximo 500 caracteres."
        else:
            cleaned["note"] = note.strip() or None

    if fields:
        raise ValidationError("Revise os campos informados.", {"fields": fields})
    return cleaned


def register_progress(
    activity_id: int, payload: Any
) -> tuple[ActivityProgressEntry, MeasurableStats]:
    activity = _require_activity(activity_id)
    cleaned = _validate_progress_payload(activity, payload)
    entry = ActivityProgressEntry(activity_id=activity_id, **cleaned)
    repository.add_progress_entry(entry)
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
    cleaned = _validate_progress_payload(activity, payload, current=entry)
    for key, value in cleaned.items():
        setattr(entry, key, value)
    repository.commit()
    stats = compute_measurable_stats(
        activity, repository.list_progress_entries(activity_id)
    )
    return entry, stats


def remove_progress(activity_id: int, entry_id: int) -> None:
    activity = _require_activity(activity_id)
    _require_measurable(activity)
    entry = repository.get_progress_entry(activity_id, entry_id)
    if entry is None:
        raise NotFoundError("Registro de progresso não encontrado.")
    repository.delete_progress_entry(entry)
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
