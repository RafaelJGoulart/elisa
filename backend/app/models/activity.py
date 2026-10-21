from __future__ import annotations

from datetime import date, datetime, timezone

from sqlalchemy import Date, DateTime, ForeignKey, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.extensions import db


def _utc_now() -> datetime:
    return datetime.now(timezone.utc)


class Activity(db.Model):
    __tablename__ = "activities"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(80), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    category: Mapped[str] = mapped_column(String(40), nullable=False)
    color: Mapped[str] = mapped_column(String(20), nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=_utc_now, nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=_utc_now, onupdate=_utc_now, nullable=False
    )

    logs: Mapped[list["ActivityLog"]] = relationship(
        back_populates="activity",
        cascade="all, delete-orphan",
        order_by="ActivityLog.date",
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
