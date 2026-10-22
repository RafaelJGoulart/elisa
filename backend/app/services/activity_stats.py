from __future__ import annotations

from dataclasses import dataclass, field
from datetime import date, timedelta
from decimal import Decimal, ROUND_HALF_UP
from typing import Any, Iterable

from app.core.errors import ValidationError
from app.models import Activity, ActivityProgressEntry, MeasurementUnit
from app.services import measurement_service

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


def period_bounds(day: date, frequency: str) -> tuple[date, date]:
    if frequency == "daily":
        return day, day
    if frequency == "weekly":
        start = day - timedelta(days=(day.weekday() + 1) % 7)
        return start, start + timedelta(days=6)
    start = day.replace(day=1)
    next_month = (start.replace(day=28) + timedelta(days=4)).replace(day=1)
    return start, next_month - timedelta(days=1)


def _period_start(day: date, frequency: str) -> date:
    return period_bounds(day, frequency)[0]


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

    current_start, current_end = period_bounds(current_day, frequency)
    current_amount = period_totals.get(current_start, Decimal("0"))
    current_met = current_start in met_periods
    current_percent = _percent(current_amount, target) if target is not None else None

    week_start, week_end = period_bounds(current_day, "weekly")
    month_start, month_end = period_bounds(current_day, "monthly")
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
