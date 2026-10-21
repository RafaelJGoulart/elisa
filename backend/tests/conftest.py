from __future__ import annotations

from pathlib import Path

import pytest

from app import create_app
from app.core.extensions import db


@pytest.fixture()
def app(tmp_path: Path):
    database_path = tmp_path / "test.db"
    application = create_app(
        {
            "TESTING": True,
            "SQLALCHEMY_DATABASE_URI": f"sqlite:///{database_path.as_posix()}",
            "SERVE_FRONTEND": False,
            "DATA_DIR": tmp_path,
            "DIARY_DIR": tmp_path / "diary",
        }
    )

    with application.app_context():
        db.create_all()

    yield application

    with application.app_context():
        db.session.remove()
        db.drop_all()


@pytest.fixture()
def client(app):
    return app.test_client()


@pytest.fixture()
def activity(client):
    response = client.post(
        "/api/activities",
        json={
            "name": "Leitura",
            "description": "Ler por 20 minutos.",
            "category": "Estudo",
            "color": "purple",
        },
    )
    assert response.status_code == 201
    return response.get_json()["activity"]
