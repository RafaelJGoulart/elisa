from __future__ import annotations

from pathlib import Path
from typing import Any

from flask import Flask

from app.api import register_blueprints
from app.core.config import Config
from app.core.errors import register_error_handlers
from app.core.extensions import db, migrate
from app.core.frontend import register_frontend


def create_app(test_config: dict[str, Any] | None = None) -> Flask:
    app = Flask(__name__, static_folder=None)
    app.config.from_object(Config)

    if test_config:
        app.config.update(test_config)

    app.json.ensure_ascii = False

    data_dir = Path(app.config.get("DATA_DIR", Config.DATA_DIR))
    data_dir.mkdir(parents=True, exist_ok=True)
    diary_dir = Path(app.config.get("DIARY_DIR", data_dir / "diary"))
    diary_dir.mkdir(parents=True, exist_ok=True)

    db.init_app(app)
    migrate.init_app(app, db)

    from app import models  # noqa: F401  (registra metadados no Alembic)

    register_blueprints(app)
    register_error_handlers(app)
    register_frontend(app)

    return app
