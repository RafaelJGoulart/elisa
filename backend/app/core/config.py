from __future__ import annotations

import os
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parents[3]
DATA_DIR = BASE_DIR / "data"
DIARY_DIR = DATA_DIR / "diary"


def _env_flag(name: str, default: bool) -> bool:
    value = os.getenv(name)
    if value is None:
        return default
    return value.strip().lower() in {"1", "true", "yes", "on"}


class Config:
    DATA_DIR = DATA_DIR
    SQLALCHEMY_DATABASE_URI = os.getenv(
        "DATABASE_URL",
        f"sqlite:///{(DATA_DIR / 'elisa.db').as_posix()}",
    )
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    SQLALCHEMY_ENGINE_OPTIONS = {"pool_pre_ping": True}
    JSON_SORT_KEYS = False
    SERVE_FRONTEND = _env_flag("SERVE_FRONTEND", True)
    FRONTEND_DIST = BASE_DIR / "frontend" / "dist"
    DIARY_DIR = DIARY_DIR
    APP_VERSION = "0.2.0"
    MAX_HISTORY_DAYS = 800
    RECENT_LOGS_DAYS = 84


class TestConfig(Config):
    TESTING = True
    SERVE_FRONTEND = False
    SQLALCHEMY_DATABASE_URI = "sqlite:///:memory:"
