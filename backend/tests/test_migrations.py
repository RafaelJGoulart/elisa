from __future__ import annotations

import sqlite3
from pathlib import Path

from alembic import command
from alembic.config import Config

from app import create_app

ROOT = Path(__file__).resolve().parents[2]


def _alembic_config() -> Config:
    config = Config(str(ROOT / "backend" / "migrations" / "alembic.ini"))
    config.set_main_option("script_location", str(ROOT / "backend" / "migrations"))
    return config


def test_migration_preserves_existing_data_and_seeds_catalogs(tmp_path: Path):
    database_path = tmp_path / "migration.db"
    app = create_app(
        {
            "TESTING": True,
            "SQLALCHEMY_DATABASE_URI": f"sqlite:///{database_path.as_posix()}",
            "SERVE_FRONTEND": False,
            "DATA_DIR": tmp_path,
            "DIARY_DIR": tmp_path / "diary",
        }
    )

    with app.app_context():
        config = _alembic_config()
        command.upgrade(config, "fe63aca33060")

        with sqlite3.connect(database_path) as connection:
            connection.execute(
                """
                INSERT INTO activities
                    (name, description, category, color, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?)
                """,
                (
                    "Hábito antigo",
                    None,
                    "Rotina",
                    "purple",
                    "2026-10-01 10:00:00.000000",
                    "2026-10-01 10:00:00.000000",
                ),
            )
            connection.execute(
                """
                INSERT INTO activity_logs (activity_id, date, created_at)
                VALUES (1, '2026-10-02', '2026-10-02 10:00:00.000000')
                """
            )
            connection.commit()

        command.upgrade(config, "head")

        with sqlite3.connect(database_path) as connection:
            activity = connection.execute(
                "SELECT name, kind, frequency, archived FROM activities WHERE id = 1"
            ).fetchone()
            assert activity == ("Hábito antigo", "binary", "daily", 0)
            assert connection.execute("SELECT COUNT(*) FROM activity_logs").fetchone() == (1,)
            assert connection.execute(
                "SELECT COUNT(*) FROM measurement_units"
            ).fetchone() == (17,)
            assert connection.execute("SELECT COUNT(*) FROM media_types").fetchone() == (12,)
            assert connection.execute(
                "SELECT code FROM measurement_units WHERE code = 'l'"
            ).fetchone() == ("l",)
            assert connection.execute(
                "SELECT COUNT(*) FROM xp_events"
            ).fetchone() == (0,)

        command.downgrade(config, "fe63aca33060")

        with sqlite3.connect(database_path) as connection:
            tables = {
                row[0]
                for row in connection.execute(
                    "SELECT name FROM sqlite_master WHERE type = 'table'"
                )
            }
            assert "measurement_units" not in tables
            assert "media_items" not in tables
            assert "activity_progress_entries" not in tables
            assert "xp_events" not in tables
            assert connection.execute(
                "SELECT COUNT(*) FROM activities"
            ).fetchone() == (1,)
            assert connection.execute(
                "SELECT COUNT(*) FROM activity_logs"
            ).fetchone() == (1,)

        command.upgrade(config, "head")
        with sqlite3.connect(database_path) as connection:
            assert connection.execute(
                "SELECT COUNT(*) FROM measurement_units"
            ).fetchone() == (17,)
