from __future__ import annotations

from dataclasses import dataclass
from datetime import date, timedelta
from decimal import Decimal
from typing import Iterable

from app.models import Activity, ActivityProgressEntry, XpEvent
from app.repositories import activity_repository
from app.repositories import xp_repository
from app.services.activity_stats import compute_measurable_stats, period_bounds

CATEGORY_HABITS = "habits"
CATEGORY_LABELS = {CATEGORY_HABITS: "Hábitos"}
KIND_OCCURRENCE = "occurrence"
KIND_WEEK_BONUS = "weekly_bonus"
REASON_GRANT = "grant"
REASON_CORRECTION = "correction"
OCCURRENCE_XP = 1
WEEK_BONUS_XP = 7


@dataclass(frozen=True)
class DesiredEvent:
    source_ref: str
    kind: str
    description: str
    amount: int
    activity_date: date


@dataclass(frozen=True)
class SyncResult:
    created: int
    occurrences: int
    weeks: int


@dataclass(frozen=True)
class LevelProgression:
    level: int
    total_xp: int
    current_level_total_xp: int
    next_level_total_xp: int
    xp_into_level: int
    xp_to_next_level: int
    xp_for_next_level: int
    progress_percent: float


@dataclass(frozen=True)
class ProfileSummary:
    progression: LevelProgression
    habit_occurrences: int
    habit_weeks: int
    habit_xp: int
    categories: list[dict[str, object]]
    recent_events: list[XpEvent]


def xp_total_for_level(level: int) -> int:
    if not isinstance(level, int) or level <= 0:
        return 0
    if level <= 16:
        return level * level + 6 * level
    if level <= 31:
        return (5 * level * level - 81 * level + 720) // 2
    return (9 * level * level - 325 * level + 4440) // 2


def level_for_xp(total_xp: int) -> int:
    total = max(0, int(total_xp))
    low = 0
    high = 1
    while xp_total_for_level(high) <= total:
        high *= 2
    while low + 1 < high:
        middle = (low + high) // 2
        if xp_total_for_level(middle) <= total:
            low = middle
        else:
            high = middle
    return low


def progression_for_xp(total_xp: int) -> LevelProgression:
    total = max(0, int(total_xp))
    level = level_for_xp(total)
    current_total = xp_total_for_level(level)
    next_total = xp_total_for_level(level + 1)
    span = next_total - current_total
    into_level = total - current_total
    return LevelProgression(
        level=level,
        total_xp=total,
        current_level_total_xp=current_total,
        next_level_total_xp=next_total,
        xp_into_level=into_level,
        xp_to_next_level=next_total - total,
        xp_for_next_level=span,
        progress_percent=round(into_level / span * 100, 2) if span else 0.0,
    )


def _week_start(day: date) -> date:
    return day - timedelta(days=(day.weekday() + 1) % 7)


def _goal_met(amount: Decimal, target: Decimal | None) -> bool:
    return amount >= target if target is not None else amount > 0


def _habit_completion(
    activity: Activity,
    log_dates: Iterable[date],
    entries: Iterable[ActivityProgressEntry],
) -> tuple[set[date], set[date]]:
    if activity.kind != "measurable":
        return set(log_dates), set()

    stats = compute_measurable_stats(activity, entries)
    target = (
        Decimal(str(activity.target_amount))
        if activity.target_amount is not None
        else None
    )
    if activity.frequency == "daily":
        completed_days = {
            item["date"] for item in stats.daily if item["goal_met"]
        }
        return completed_days, set()

    period_totals: dict[date, Decimal] = {}
    for item in stats.daily:
        start = period_bounds(item["date"], activity.frequency)[0]
        period_totals[start] = period_totals.get(start, Decimal("0")) + item["amount"]
    met_periods = {
        start for start, amount in period_totals.items() if _goal_met(amount, target)
    }
    return set(), met_periods


def _desired_events(
    activity: Activity,
    log_dates: Iterable[date],
    entries: Iterable[ActivityProgressEntry],
) -> dict[str, DesiredEvent]:
    completed_days, met_periods = _habit_completion(activity, log_dates, entries)
    desired: dict[str, DesiredEvent] = {}
    prefix = f"habit:{activity.id}"

    if activity.frequency == "daily":
        for day in sorted(completed_days):
            source_ref = f"{prefix}:log:{day.isoformat()}"
            description = (
                f"Meta diária atingida: {activity.name}"
                if activity.kind == "measurable"
                else f"Hábito concluído: {activity.name}"
            )
            desired[source_ref] = DesiredEvent(
                source_ref=source_ref,
                kind=KIND_OCCURRENCE,
                description=description,
                amount=OCCURRENCE_XP,
                activity_date=day,
            )
    else:
        for start in sorted(met_periods):
            label = "semanal" if activity.frequency == "weekly" else "mensal"
            source_ref = f"{prefix}:{activity.frequency}:{start.isoformat()}"
            desired[source_ref] = DesiredEvent(
                source_ref=source_ref,
                kind=KIND_OCCURRENCE,
                description=f"Meta {label} atingida: {activity.name}",
                amount=OCCURRENCE_XP,
                activity_date=start,
            )

    if activity.frequency not in {"daily", "weekly"}:
        return desired

    bonus_weeks: set[date] = set()
    if activity.frequency == "weekly":
        bonus_weeks = set(met_periods)
    else:
        for week_start in {_week_start(day) for day in completed_days}:
            week_days = {
                week_start + timedelta(days=offset) for offset in range(7)
            }
            if week_days.issubset(completed_days):
                bonus_weeks.add(week_start)

    for week_start in sorted(bonus_weeks):
        source_ref = f"{prefix}:week_bonus:{week_start.isoformat()}"
        desired[source_ref] = DesiredEvent(
            source_ref=source_ref,
            kind=KIND_WEEK_BONUS,
            description=f"Semana completa: {activity.name}",
            amount=WEEK_BONUS_XP,
            activity_date=week_start + timedelta(days=6),
        )

    return desired


def _sync_activity(activity: Activity) -> SyncResult:
    log_dates = activity_repository.list_log_dates(activity.id)
    entries = (
        activity_repository.list_progress_entries(activity.id)
        if activity.kind == "measurable"
        else []
    )
    desired = _desired_events(activity, log_dates, entries)
    current = xp_repository.net_by_source_ref(activity.id)
    counts = xp_repository.event_counts_by_source_ref(activity.id)

    created = 0
    for source_ref in sorted(set(current) | set(desired)):
        target = desired.get(source_ref)
        target_amount = target.amount if target is not None else 0
        current_amount = current.get(source_ref, 0)
        if target_amount == current_amount:
            continue

        previous = xp_repository.last_event_for_ref(source_ref) if target is None else None
        if target is None and previous is None:
            continue

        generation = counts.get(source_ref, 0) + 1
        xp_repository.add_event(
            XpEvent(
                event_key=f"{source_ref}:g{generation}",
                activity_id=activity.id,
                source="habit",
                source_ref=source_ref,
                category=CATEGORY_HABITS,
                kind=target.kind if target is not None else previous.kind,
                reason=(
                    REASON_GRANT
                    if target is not None and counts.get(source_ref, 0) == 0
                    else REASON_CORRECTION
                ),
                description=(
                    target.description
                    if target is not None
                    else f"Estorno: {previous.description}"[:255]
                ),
                amount=target_amount - current_amount,
                activity_date=(
                    target.activity_date if target is not None else previous.activity_date
                ),
            )
        )
        created += 1

    xp_repository.flush()
    occurrences = sum(
        1 for event in desired.values() if event.kind == KIND_OCCURRENCE
    )
    weeks = sum(1 for event in desired.values() if event.kind == KIND_WEEK_BONUS)
    return SyncResult(created=created, occurrences=occurrences, weeks=weeks)


def sync_activity(activity_id: int) -> SyncResult:
    activity = activity_repository.get_activity(activity_id)
    if activity is None:
        return SyncResult(created=0, occurrences=0, weeks=0)
    return _sync_activity(activity)


def sync_all_habits() -> SyncResult:
    created = 0
    occurrences = 0
    weeks = 0
    for activity in activity_repository.list_activities(include_archived=True):
        result = _sync_activity(activity)
        created += result.created
        occurrences += result.occurrences
        weeks += result.weeks
    return SyncResult(created=created, occurrences=occurrences, weeks=weeks)


def revoke_activity(activity_id: int) -> int:
    current = xp_repository.net_by_source_ref(activity_id)
    counts = xp_repository.event_counts_by_source_ref(activity_id)
    created = 0
    for source_ref, amount in current.items():
        if amount == 0:
            continue
        previous = xp_repository.last_event_for_ref(source_ref)
        if previous is None:
            continue
        generation = counts.get(source_ref, 0) + 1
        xp_repository.add_event(
            XpEvent(
                event_key=f"{source_ref}:g{generation}",
                activity_id=activity_id,
                source="habit",
                source_ref=source_ref,
                category=CATEGORY_HABITS,
                kind=previous.kind,
                reason=REASON_CORRECTION,
                description=f"Estorno: {previous.description}"[:255],
                amount=-amount,
                activity_date=previous.activity_date,
            )
        )
        created += 1
    xp_repository.flush()
    return created


def build_profile(recent_limit: int = 20) -> ProfileSummary:
    result = sync_all_habits()
    if result.created:
        xp_repository.commit()
    total = xp_repository.total()
    categories_totals = xp_repository.total_by_category()
    categories = [
        {
            "key": category,
            "label": CATEGORY_LABELS.get(category, category),
            "xp": xp,
        }
        for category, xp in categories_totals.items()
        if xp != 0
    ]
    return ProfileSummary(
        progression=progression_for_xp(total),
        habit_occurrences=result.occurrences,
        habit_weeks=result.weeks,
        habit_xp=categories_totals.get(CATEGORY_HABITS, 0),
        categories=categories,
        recent_events=xp_repository.recent_events(recent_limit),
    )
