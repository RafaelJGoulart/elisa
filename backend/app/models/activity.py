from __future__ import annotations

from datetime import date, datetime, timezone
from decimal import Decimal

from sqlalchemy import (
    Boolean,
    Date,
    DateTime,
    ForeignKey,
    Numeric,
    String,
    Text,
    UniqueConstraint,
    text,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.extensions import db


def _utc_now() -> datetime:
    return datetime.now(timezone.utc)


class MeasurementUnit(db.Model):
    """Unidade de medida disponível para hábitos mensuráveis.

    ``dimension`` identifica o que pode ser convertido: unidades da mesma
    dimensão compartilham a mesma grandeza e usam ``factor`` para a unidade
    base. Unidades personalizadas recebem uma dimensão própria, portanto nunca
    são convertidas para outra unidade por acidente.
    """

    __tablename__ = "measurement_units"

    id: Mapped[int] = mapped_column(primary_key=True)
    code: Mapped[str] = mapped_column(String(60), nullable=False, unique=True)
    name: Mapped[str] = mapped_column(String(60), nullable=False)
    symbol: Mapped[str] = mapped_column(String(16), nullable=False)
    category: Mapped[str] = mapped_column(String(40), nullable=False)
    dimension: Mapped[str] = mapped_column(String(80), nullable=False, index=True)
    factor: Mapped[Decimal] = mapped_column(
        Numeric(18, 6), nullable=False, default=Decimal("1")
    )
    is_system: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=False, server_default=text("0")
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=_utc_now, nullable=False
    )

    def __repr__(self) -> str:
        return f"<MeasurementUnit {self.code} {self.symbol!r}>"


class Activity(db.Model):
    __tablename__ = "activities"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(80), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    category: Mapped[str] = mapped_column(String(40), nullable=False)
    color: Mapped[str] = mapped_column(String(20), nullable=False)
    kind: Mapped[str] = mapped_column(
        String(16), nullable=False, default="binary", server_default="binary"
    )
    unit_id: Mapped[int | None] = mapped_column(
        ForeignKey("measurement_units.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    target_amount: Mapped[Decimal | None] = mapped_column(Numeric(14, 4), nullable=True)
    frequency: Mapped[str] = mapped_column(
        String(16), nullable=False, default="daily", server_default="daily"
    )
    archived: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=False, server_default=text("0")
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=_utc_now, nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=_utc_now, onupdate=_utc_now, nullable=False
    )

    unit: Mapped[MeasurementUnit | None] = relationship(lazy="joined")
    logs: Mapped[list["ActivityLog"]] = relationship(
        back_populates="activity",
        cascade="all, delete-orphan",
        order_by="ActivityLog.date",
    )
    progress_entries: Mapped[list["ActivityProgressEntry"]] = relationship(
        back_populates="activity",
        cascade="all, delete-orphan",
        order_by="ActivityProgressEntry.entry_date",
    )

    def __repr__(self) -> str:
        return f"<Activity {self.id} {self.name!r}>"


class ActivityLog(db.Model):
    __tablename__ = "activity_logs"
    __table_args__ = (
        UniqueConstraint("activity_id", "date", name="uq_activity_logs_activity_date"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    activity_id: Mapped[int] = mapped_column(
        ForeignKey("activities.id", ondelete="CASCADE"), nullable=False, index=True
    )
    date: Mapped[date] = mapped_column(Date, nullable=False, index=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=_utc_now, nullable=False
    )

    activity: Mapped[Activity] = relationship(back_populates="logs")

    def __repr__(self) -> str:
        return f"<ActivityLog activity={self.activity_id} date={self.date}>"


class ActivityProgressEntry(db.Model):
    """Registro quantitativo de um hábito mensurável.

    Vários registros podem existir no mesmo dia. O valor é armazenado na
    unidade escolhida no momento do registro; a conversão para a unidade do
    hábito acontece nas agregações, sem perder o histórico original.
    """

    __tablename__ = "activity_progress_entries"

    id: Mapped[int] = mapped_column(primary_key=True)
    activity_id: Mapped[int] = mapped_column(
        ForeignKey("activities.id", ondelete="CASCADE"), nullable=False, index=True
    )
    entry_date: Mapped[date] = mapped_column(Date, nullable=False, index=True)
    amount: Mapped[Decimal] = mapped_column(Numeric(14, 4), nullable=False)
    unit_id: Mapped[int] = mapped_column(
        ForeignKey("measurement_units.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )
    note: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=_utc_now, nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=_utc_now, onupdate=_utc_now, nullable=False
    )

    activity: Mapped[Activity] = relationship(back_populates="progress_entries")
    unit: Mapped[MeasurementUnit] = relationship(lazy="joined")

    def __repr__(self) -> str:
        return (
            f"<ActivityProgressEntry activity={self.activity_id} "
            f"date={self.entry_date} amount={self.amount}>"
        )
