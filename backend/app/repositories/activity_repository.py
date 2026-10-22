from __future__ import annotations

from datetime import date

from sqlalchemy import select

from app.core.extensions import db
from app.models import (
    Activity,
    ActivityLog,
    ActivityProgressEntry,
    MeasurementUnit,
)


def list_activities(include_archived: bool = False) -> list[Activity]:
    statement = select(Activity)
    if not include_archived:
        statement = statement.where(Activity.archived.is_(False))
    statement = statement.order_by(Activity.created_at.desc(), Activity.id.desc())
    return list(db.session.scalars(statement).unique().all())


def get_activity(activity_id: int) -> Activity | None:
    return db.session.get(Activity, activity_id)


def add_activity(activity: Activity) -> Activity:
    db.session.add(activity)
    return activity


def delete_activity(activity: Activity) -> None:
    db.session.delete(activity)


def list_logs(activity_id: int, start: date, end: date) -> list[ActivityLog]:
    statement = (
        select(ActivityLog)
        .where(
            ActivityLog.activity_id == activity_id,
            ActivityLog.date >= start,
            ActivityLog.date <= end,
        )
        .order_by(ActivityLog.date.asc())
    )
    return list(db.session.scalars(statement).all())


def get_log(activity_id: int, log_date: date) -> ActivityLog | None:
    statement = select(ActivityLog).where(
        ActivityLog.activity_id == activity_id,
        ActivityLog.date == log_date,
    )
    return db.session.scalar(statement)


def add_log(log: ActivityLog) -> ActivityLog:
    db.session.add(log)
    return log


def delete_log(log: ActivityLog) -> None:
    db.session.delete(log)


def list_all_logs() -> list[ActivityLog]:
    statement = select(ActivityLog).order_by(ActivityLog.date.asc())
    return list(db.session.scalars(statement).all())


def list_log_dates(activity_id: int) -> list[date]:
    statement = (
        select(ActivityLog.date)
        .where(ActivityLog.activity_id == activity_id)
        .order_by(ActivityLog.date.asc())
    )
    return list(db.session.scalars(statement).all())


def list_units() -> list[MeasurementUnit]:
    statement = select(MeasurementUnit).order_by(
        MeasurementUnit.category.asc(), MeasurementUnit.name.asc()
    )
    return list(db.session.scalars(statement).all())


def get_unit(unit_id: int) -> MeasurementUnit | None:
    return db.session.get(MeasurementUnit, unit_id)


def get_unit_by_code(code: str) -> MeasurementUnit | None:
    statement = select(MeasurementUnit).where(MeasurementUnit.code == code)
    return db.session.scalar(statement)


def add_unit(unit: MeasurementUnit) -> MeasurementUnit:
    db.session.add(unit)
    return unit


def list_progress_entries(
    activity_id: int, start: date | None = None, end: date | None = None
) -> list[ActivityProgressEntry]:
    statement = select(ActivityProgressEntry).where(
        ActivityProgressEntry.activity_id == activity_id
    )
    if start is not None:
        statement = statement.where(ActivityProgressEntry.entry_date >= start)
    if end is not None:
        statement = statement.where(ActivityProgressEntry.entry_date <= end)
    statement = statement.order_by(
        ActivityProgressEntry.entry_date.asc(), ActivityProgressEntry.id.asc()
    )
    return list(db.session.scalars(statement).unique().all())


def list_all_progress_entries() -> list[ActivityProgressEntry]:
    statement = select(ActivityProgressEntry).order_by(
        ActivityProgressEntry.entry_date.asc(), ActivityProgressEntry.id.asc()
    )
    return list(db.session.scalars(statement).unique().all())


def get_progress_entry(
    activity_id: int, entry_id: int
) -> ActivityProgressEntry | None:
    statement = select(ActivityProgressEntry).where(
        ActivityProgressEntry.activity_id == activity_id,
        ActivityProgressEntry.id == entry_id,
    )
    return db.session.scalar(statement)


def add_progress_entry(entry: ActivityProgressEntry) -> ActivityProgressEntry:
    db.session.add(entry)
    return entry


def delete_progress_entry(entry: ActivityProgressEntry) -> None:
    db.session.delete(entry)


def commit() -> None:
    try:
        db.session.commit()
    except Exception:
        db.session.rollback()
        raise


def flush() -> None:
    db.session.flush()
