from __future__ import annotations

from collections.abc import Iterable
from datetime import date

from sqlalchemy import func, select

from app.core.extensions import db
from app.models import DiaryEntry


def get_entry(entry_id: str) -> DiaryEntry | None:
    return db.session.get(DiaryEntry, entry_id)


def get_entry_by_path(file_path: str) -> DiaryEntry | None:
    statement = select(DiaryEntry).where(DiaryEntry.file_path == file_path)
    return db.session.scalar(statement)


def add_entry(entry: DiaryEntry) -> DiaryEntry:
    db.session.add(entry)
    return entry


def delete_entry(entry: DiaryEntry) -> None:
    db.session.delete(entry)


def _filtered_statement(start: date | None, end: date | None):
    statement = select(DiaryEntry)
    if start is not None:
        statement = statement.where(DiaryEntry.entry_date >= start)
    if end is not None:
        statement = statement.where(DiaryEntry.entry_date <= end)
    return statement.order_by(DiaryEntry.created_at.desc(), DiaryEntry.id.desc())


def iter_entries(start: date | None, end: date | None) -> Iterable[DiaryEntry]:
    result = db.session.scalars(
        _filtered_statement(start, end).execution_options(yield_per=100)
    )
    return iter(result)


def list_all_entries() -> list[DiaryEntry]:
    return list(db.session.scalars(select(DiaryEntry)).all())


def count_entries() -> int:
    return db.session.scalar(select(func.count()).select_from(DiaryEntry)) or 0


def delete_missing_entries(existing_paths: set[str]) -> int:
    removed = 0
    for entry in list_all_entries():
        if entry.file_path not in existing_paths:
            db.session.delete(entry)
            removed += 1
    return removed


def commit() -> None:
    try:
        db.session.commit()
    except Exception:
        db.session.rollback()
        raise
