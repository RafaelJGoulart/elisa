from __future__ import annotations

from flask import Blueprint, current_app, jsonify
from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError

from app.core.extensions import db

health_bp = Blueprint("health", __name__, url_prefix="/api")


@health_bp.get("/health")
def health():
    try:
        db.session.execute(text("SELECT 1"))
        database = "ok"
        status = "ok"
        status_code = 200
    except SQLAlchemyError:
        current_app.logger.exception("Falha ao verificar o banco de dados.")
        database = "unavailable"
        status = "degraded"
        status_code = 503

    return (
        jsonify(
            {
                "status": status,
                "version": current_app.config.get("APP_VERSION", "0.0.0"),
                "database": database,
            }
        ),
        status_code,
    )
