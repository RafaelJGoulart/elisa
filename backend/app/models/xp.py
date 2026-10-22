from __future__ import annotations

from datetime import date, datetime, timezone

from sqlalchemy import Date, DateTime, Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from app.core.extensions import db


def _utc_now() -> datetime:
    return datetime.now(timezone.utc)


class XpEvent(db.Model):
    """Evento imutável do extrato de EXP.

    O saldo é sempre a soma de ``amount``. Correções entram como novos eventos
    com sinal oposto, preservando o histórico. ``event_key`` identifica a
    geração daquela origem para impedir concessões duplicadas.
    """

    __tablename__ = "xp_events"

    id: Mapped[int] = mapped_column(primary_key=True)
    event_key: Mapped[str] = mapped_column(String(220), nullable=False, unique=True)
    activity_id: Mapped[int | None] = mapped_column(Integer, nullable=True, index=True)
    source: Mapped[str] = mapped_column(String(40), nullable=False, index=True)
    source_ref: Mapped[str] = mapped_column(String(160), nullable=False, index=True)
    category: Mapped[str] = mapped_column(String(40), nullable=False, index=True)
    kind: Mapped[str] = mapped_column(String(40), nullable=False)
    reason: Mapped[str] = mapped_column(String(20), nullable=False)
    description: Mapped[str] = mapped_column(String(255), nullable=False)
    amount: Mapped[int] = mapped_column(Integer, nullable=False)
    activity_date: Mapped[date] = mapped_column(Date, nullable=False, index=True)
    recorded_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=_utc_now, nullable=False, index=True
    )

    def __repr__(self) -> str:
        return (
            f"<XpEvent {self.id} {self.source_ref!r} "
            f"amount={self.amount} reason={self.reason!r}>"
        )
