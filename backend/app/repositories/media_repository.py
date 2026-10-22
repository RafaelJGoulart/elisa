from __future__ import annotations

from datetime import date
from typing import Any

from sqlalchemy import func, or_, select

from app.core.extensions import db
from app.models import (
    Genre,
    MediaConsumptionEvent,
    MediaItem,
    MediaType,
    media_item_genres,
)


def list_media_types() -> list[MediaType]:
    statement = select(MediaType).order_by(MediaType.name.asc())
    return list(db.session.scalars(statement).all())


def get_media_type(type_id: int) -> MediaType | None:
    return db.session.get(MediaType, type_id)


def get_media_type_by_code(code: str) -> MediaType | None:
    statement = select(MediaType).where(MediaType.code == code)
    return db.session.scalar(statement)


def add_media_type(media_type: MediaType) -> MediaType:
    db.session.add(media_type)
    return media_type


def list_genres() -> list[Genre]:
    statement = select(Genre).order_by(Genre.name.asc())
    return list(db.session.scalars(statement).all())


def get_genre_by_name(name: str) -> Genre | None:
    statement = select(Genre).where(func.lower(Genre.name) == name.strip().lower())
    return db.session.scalar(statement)


def add_genre(genre: Genre) -> Genre:
    db.session.add(genre)
    return genre


def find_item_by_title(
    media_type_id: int, title: str, exclude_id: int | None = None
) -> MediaItem | None:
    statement = select(MediaItem).where(
        MediaItem.media_type_id == media_type_id,
        func.lower(MediaItem.title) == title.strip().lower(),
    )
    if exclude_id is not None:
        statement = statement.where(MediaItem.id != exclude_id)
    return db.session.scalar(statement)


def _item_filters(
    *,
    query: str | None,
    type_id: int | None,
    status: str | None,
    genre: str | None,
    include_archived: bool,
) -> list[Any]:
    conditions: list[Any] = []
    if not include_archived:
        conditions.append(MediaItem.archived.is_(False))
    if query:
        pattern = f"%{query.strip().lower()}%"
        conditions.append(
            or_(
                func.lower(MediaItem.title).like(pattern),
                func.lower(func.coalesce(MediaItem.alternate_title, "")).like(pattern),
                func.lower(func.coalesce(MediaItem.creator, "")).like(pattern),
            )
        )
    if type_id is not None:
        conditions.append(MediaItem.media_type_id == type_id)
    if status:
        conditions.append(MediaItem.status == status)
    if genre:
        conditions.append(
            MediaItem.id.in_(
                select(media_item_genres.c.media_item_id)
                .join(Genre, Genre.id == media_item_genres.c.genre_id)
                .where(func.lower(Genre.name) == genre.strip().lower())
            )
        )
    return conditions


def list_items(
    *,
    query: str | None = None,
    type_id: int | None = None,
    status: str | None = None,
    genre: str | None = None,
    include_archived: bool = False,
    sort: str = "recent",
    limit: int = 24,
    offset: int = 0,
) -> tuple[list[MediaItem], int]:
    conditions = _item_filters(
        query=query,
        type_id=type_id,
        status=status,
        genre=genre,
        include_archived=include_archived,
    )

    count_statement = select(func.count(func.distinct(MediaItem.id))).select_from(
        MediaItem
    )
    if conditions:
        count_statement = count_statement.where(*conditions)
    total = int(db.session.scalar(count_statement) or 0)

    last_event = (
        select(
            MediaConsumptionEvent.media_item_id.label("media_item_id"),
            func.max(MediaConsumptionEvent.consumed_on).label("last_consumed_on"),
        )
        .group_by(MediaConsumptionEvent.media_item_id)
        .subquery()
    )

    statement = select(MediaItem)
    if sort == "recent":
        statement = statement.outerjoin(
            last_event, last_event.c.media_item_id == MediaItem.id
        )
    if conditions:
        statement = statement.where(*conditions)

    if sort == "title":
        statement = statement.order_by(func.lower(MediaItem.title).asc())
    elif sort == "rating":
        statement = statement.order_by(
            MediaItem.rating.is_(None), MediaItem.rating.desc(), MediaItem.title.asc()
        )
    elif sort == "year":
        statement = statement.order_by(
            MediaItem.release_year.is_(None),
            MediaItem.release_year.desc(),
            MediaItem.title.asc(),
        )
    elif sort == "created":
        statement = statement.order_by(MediaItem.created_at.desc(), MediaItem.id.desc())
    else:
        statement = statement.order_by(
            last_event.c.last_consumed_on.desc().nulls_last(),
            MediaItem.created_at.desc(),
            MediaItem.id.desc(),
        )

    statement = statement.offset(max(offset, 0)).limit(max(1, min(limit, 100)))
    rows = list(db.session.scalars(statement).unique().all())
    return rows, total


def list_all_items(
    *, type_id: int | None = None, genre: str | None = None, include_archived: bool = False
) -> list[MediaItem]:
    conditions = _item_filters(
        query=None,
        type_id=type_id,
        status=None,
        genre=genre,
        include_archived=include_archived,
    )
    statement = select(MediaItem)
    if conditions:
        statement = statement.where(*conditions)
    statement = statement.order_by(MediaItem.title.asc())
    return list(db.session.scalars(statement).unique().all())


def get_item(item_id: int) -> MediaItem | None:
    return db.session.get(MediaItem, item_id)


def add_item(item: MediaItem) -> MediaItem:
    db.session.add(item)
    return item


def delete_item(item: MediaItem) -> None:
    db.session.delete(item)


def list_events(
    *,
    start: date | None = None,
    end: date | None = None,
    type_id: int | None = None,
    genre: str | None = None,
    item_id: int | None = None,
    descending: bool = False,
) -> list[MediaConsumptionEvent]:
    statement = select(MediaConsumptionEvent).join(MediaItem)
    if item_id is not None:
        statement = statement.where(MediaConsumptionEvent.media_item_id == item_id)
    if start is not None:
        statement = statement.where(MediaConsumptionEvent.consumed_on >= start)
    if end is not None:
        statement = statement.where(MediaConsumptionEvent.consumed_on <= end)
    if type_id is not None:
        statement = statement.where(MediaItem.media_type_id == type_id)
    if genre:
        statement = statement.where(
            MediaItem.id.in_(
                select(media_item_genres.c.media_item_id)
                .join(Genre, Genre.id == media_item_genres.c.genre_id)
                .where(func.lower(Genre.name) == genre.strip().lower())
            )
        )
    order = (
        MediaConsumptionEvent.consumed_on.desc()
        if descending
        else MediaConsumptionEvent.consumed_on.asc()
    )
    statement = statement.order_by(order, MediaConsumptionEvent.id.desc())
    return list(db.session.scalars(statement).unique().all())


def list_events_page(
    *,
    start: date | None = None,
    end: date | None = None,
    type_id: int | None = None,
    genre: str | None = None,
    item_id: int | None = None,
    limit: int = 30,
    offset: int = 0,
) -> tuple[list[MediaConsumptionEvent], int]:
    statement = select(MediaConsumptionEvent).join(MediaItem)
    count_statement = select(func.count(MediaConsumptionEvent.id)).select_from(
        MediaConsumptionEvent
    ).join(MediaItem)
    conditions: list[Any] = []
    if item_id is not None:
        conditions.append(MediaConsumptionEvent.media_item_id == item_id)
    if start is not None:
        conditions.append(MediaConsumptionEvent.consumed_on >= start)
    if end is not None:
        conditions.append(MediaConsumptionEvent.consumed_on <= end)
    if type_id is not None:
        conditions.append(MediaItem.media_type_id == type_id)
    if genre:
        conditions.append(
            MediaItem.id.in_(
                select(media_item_genres.c.media_item_id)
                .join(Genre, Genre.id == media_item_genres.c.genre_id)
                .where(func.lower(Genre.name) == genre.strip().lower())
            )
        )
    if conditions:
        statement = statement.where(*conditions)
        count_statement = count_statement.where(*conditions)

    total = int(db.session.scalar(count_statement) or 0)
    statement = (
        statement.order_by(
            MediaConsumptionEvent.consumed_on.desc(), MediaConsumptionEvent.id.desc()
        )
        .offset(max(offset, 0))
        .limit(max(1, min(limit, 100)))
    )
    rows = list(db.session.scalars(statement).unique().all())
    return rows, total


def get_event(event_id: int) -> MediaConsumptionEvent | None:
    return db.session.get(MediaConsumptionEvent, event_id)


def add_event(event: MediaConsumptionEvent) -> MediaConsumptionEvent:
    db.session.add(event)
    return event


def delete_event(event: MediaConsumptionEvent) -> None:
    db.session.delete(event)


def count_items_by_status() -> dict[str, int]:
    statement = select(MediaItem.status, func.count(MediaItem.id)).group_by(
        MediaItem.status
    )
    return {status: int(count) for status, count in db.session.execute(statement)}


def commit() -> None:
    try:
        db.session.commit()
    except Exception:
        db.session.rollback()
        raise
