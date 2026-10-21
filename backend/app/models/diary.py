from __future__ import annotations

from datetime import date, datetime

from sqlalchemy import Date, DateTime, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.core.extensions import db


class DiaryEntry(db.Model):
    __tablename__ = "diary_entries"

    id: Mapped[str] = mapped_column(String(32), primary_key=True)
    file_path: Mapped[str] = mapped_column(String(255), unique=True, nullable=False)
    title: Mapped[str] = mapped_column(String(160), nullable=False, default="")
    entry_date: Mapped[date] = mapped_column(Date, nullable=False, index=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, index=True
    )
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    tags_json: Mapped[str] = mapped_column(Text, nullable=False, default="[]")

    def __repr__(self) -> str:
        return f"<DiaryEntry {self.id} {self.created_at.isoformat()}>"
