from __future__ import annotations

from sqlalchemy import func, select

from app.core.extensions import db
from app.models import XpEvent


def add_event(event: XpEvent) -> XpEvent:
    db.session.add(event)
    return event


def flush() -> None:
    db.session.flush()


def commit() -> None:
    db.session.commit()


def net_by_source_ref(activity_id: int) -> dict[str, int]:
    statement = (
        select(XpEvent.source_ref, func.coalesce(func.sum(XpEvent.amount), 0))
        .where(XpEvent.activity_id == activity_id)
        .group_by(XpEvent.source_ref)
    )
    return {source_ref: int(amount) for source_ref, amount in db.session.execute(statement)}


def event_counts_by_source_ref(activity_id: int) -> dict[str, int]:
    statement = (
        select(XpEvent.source_ref, func.count(XpEvent.id))
        .where(XpEvent.activity_id == activity_id)
        .group_by(XpEvent.source_ref)
    )
    return {source_ref: int(count) for source_ref, count in db.session.execute(statement)}


def last_event_for_ref(source_ref: str) -> XpEvent | None:
    statement = (
        select(XpEvent)
        .where(XpEvent.source_ref == source_ref)
        .order_by(XpEvent.id.desc())
        .limit(1)
    )
    return db.session.scalar(statement)


def total() -> int:
    return int(db.session.scalar(select(func.coalesce(func.sum(XpEvent.amount), 0))))


def total_by_category() -> dict[str, int]:
    statement = (
        select(XpEvent.category, func.coalesce(func.sum(XpEvent.amount), 0))
        .group_by(XpEvent.category)
        .order_by(XpEvent.category.asc())
    )
    return {category: int(amount) for category, amount in db.session.execute(statement)}


def recent_events(limit: int = 20) -> list[XpEvent]:
    statement = (
        select(XpEvent)
        .order_by(XpEvent.recorded_at.desc(), XpEvent.id.desc())
        .limit(limit)
    )
    return list(db.session.scalars(statement).all())
