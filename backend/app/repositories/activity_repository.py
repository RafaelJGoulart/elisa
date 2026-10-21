from __future__ import annotations

from datetime import date

from sqlalchemy import select

from app.core.extensions import db
from app.models import Activity, ActivityLog


def list_activities() -> list[Activity]:
    statement = select(Activity).order_by(Activity.created_at.desc(), Activity.id.desc())
    return list(db.session.scalars(statement).all())


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


def commit() -> None:
    try:
        db.session.commit()
    except Exception:
        db.session.rollback()
        raise
