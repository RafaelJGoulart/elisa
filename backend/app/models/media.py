from __future__ import annotations

from datetime import date, datetime, timezone
from decimal import Decimal

from sqlalchemy import (
    Boolean,
    Column,
    Date,
    DateTime,
    ForeignKey,
    Integer,
    Numeric,
    String,
    Table,
    Text,
    UniqueConstraint,
    text,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.extensions import db


def _utc_now() -> datetime:
    return datetime.now(timezone.utc)


class MediaType(db.Model):
    """Tipo de mídia configurável.

    Os tipos padrão são semeados de forma idempotente. Tipos personalizados
    reutilizam o mesmo contrato e usam ``default_unit``/``unit_label`` para
    orientar o registro de consumo.
    """

    __tablename__ = "media_types"

    id: Mapped[int] = mapped_column(primary_key=True)
    code: Mapped[str] = mapped_column(String(40), nullable=False, unique=True)
    name: Mapped[str] = mapped_column(String(60), nullable=False)
    default_unit: Mapped[str] = mapped_column(String(30), nullable=False, default="unit")
    unit_label: Mapped[str] = mapped_column(String(30), nullable=False, default="unidades")
    is_system: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=False, server_default=text("0")
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=_utc_now, nullable=False
    )

    items: Mapped[list["MediaItem"]] = relationship(back_populates="media_type")

    def __repr__(self) -> str:
        return f"<MediaType {self.code} {self.name!r}>"


class Genre(db.Model):
    __tablename__ = "media_genres"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(40), nullable=False, unique=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=_utc_now, nullable=False
    )

    def __repr__(self) -> str:
        return f"<Genre {self.name!r}>"


media_item_genres = Table(
    "media_item_genres",
    db.metadata,
    Column(
        "media_item_id",
        ForeignKey("media_items.id", ondelete="CASCADE"),
        primary_key=True,
    ),
    Column(
        "genre_id",
        ForeignKey("media_genres.id", ondelete="CASCADE"),
        primary_key=True,
    ),
)


class MediaItem(db.Model):
    __tablename__ = "media_items"
    __table_args__ = (
        UniqueConstraint("media_type_id", "title", name="uq_media_items_type_title"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    media_type_id: Mapped[int] = mapped_column(
        ForeignKey("media_types.id", ondelete="RESTRICT"), nullable=False, index=True
    )
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    alternate_title: Mapped[str | None] = mapped_column(String(200), nullable=True)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    release_year: Mapped[int | None] = mapped_column(Integer, nullable=True)
    creator: Mapped[str | None] = mapped_column(String(160), nullable=True)
    total_units: Mapped[int | None] = mapped_column(Integer, nullable=True)
    total_volumes: Mapped[int | None] = mapped_column(Integer, nullable=True)
    average_duration_minutes: Mapped[int | None] = mapped_column(Integer, nullable=True)
    total_duration_minutes: Mapped[int | None] = mapped_column(Integer, nullable=True)
    unit_label: Mapped[str | None] = mapped_column(String(30), nullable=True)
    rating: Mapped[int | None] = mapped_column(Integer, nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    status: Mapped[str] = mapped_column(
        String(20), nullable=False, default="want", server_default="want", index=True
    )
    started_on: Mapped[date | None] = mapped_column(Date, nullable=True)
    finished_on: Mapped[date | None] = mapped_column(Date, nullable=True)
    archived: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=False, server_default=text("0")
    )
    progress_override: Mapped[Decimal | None] = mapped_column(
        Numeric(14, 2), nullable=True
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=_utc_now, nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=_utc_now, onupdate=_utc_now, nullable=False
    )

    media_type: Mapped[MediaType] = relationship(back_populates="items", lazy="joined")
    genres: Mapped[list[Genre]] = relationship(
        secondary=media_item_genres,
        lazy="selectin",
        order_by="Genre.name",
    )
    events: Mapped[list["MediaConsumptionEvent"]] = relationship(
        back_populates="media_item",
        cascade="all, delete-orphan",
        order_by="MediaConsumptionEvent.consumed_on, MediaConsumptionEvent.id",
    )

    def __repr__(self) -> str:
        return f"<MediaItem {self.id} {self.title!r}>"


class MediaConsumptionEvent(db.Model):
    """Evento independente de consumo de uma mídia.

    ``consumed_on`` é a data local do consumo. ``created_at`` é o instante UTC
    do registro. ``duration_minutes`` representa tempo real informado pelo
    usuário; quando ausente, as estatísticas podem estimar a partir da duração
    média conhecida do item e marcar o valor como estimativa.
    """

    __tablename__ = "media_consumption_events"

    id: Mapped[int] = mapped_column(primary_key=True)
    media_item_id: Mapped[int] = mapped_column(
        ForeignKey("media_items.id", ondelete="CASCADE"), nullable=False, index=True
    )
    consumed_on: Mapped[date] = mapped_column(Date, nullable=False, index=True)
    amount: Mapped[Decimal] = mapped_column(Numeric(14, 3), nullable=False)
    unit: Mapped[str] = mapped_column(String(30), nullable=False)
    duration_minutes: Mapped[Decimal | None] = mapped_column(
        Numeric(10, 2), nullable=True
    )
    note: Mapped[str | None] = mapped_column(Text, nullable=True)
    is_repeat: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=False, server_default=text("0")
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=_utc_now, nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=_utc_now, onupdate=_utc_now, nullable=False
    )

    media_item: Mapped[MediaItem] = relationship(back_populates="events")

    def __repr__(self) -> str:
        return (
            f"<MediaConsumptionEvent item={self.media_item_id} "
            f"date={self.consumed_on} amount={self.amount}{self.unit}>"
        )
