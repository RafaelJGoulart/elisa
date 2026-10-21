from __future__ import annotations

from flask import Flask

from app.api.activities import activities_bp
from app.api.diary import diary_bp
from app.api.health import health_bp


def register_blueprints(app: Flask) -> None:
    app.register_blueprint(health_bp)
    app.register_blueprint(activities_bp)
    app.register_blueprint(diary_bp)
