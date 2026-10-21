from __future__ import annotations

import json
import re
import time
from datetime import date, datetime, timedelta
from pathlib import Path

import pytest
import yaml

from app import create_app
from app.core.extensions import db
from app.models import DiaryEntry
from app.repositories.diary_file_store import (
    DiaryDocument,
    DiaryFileError,
    DiaryFileStore,
)

ENTRY_ID = re.compile(r"^[0-9a-f]{32}$")


def _create_entry(client, **overrides):
    payload = {
        "title": "Um registro",
        "content": "Hoje escrevi sobre o dia.",
        "tags": ["pessoal"],
    }
    payload.update(overrides)
    response = client.post("/api/diary", json=payload)
    assert response.status_code == 201, response.get_json()
    return response.get_json()["entry"]


def _diary_files(app) -> list[Path]:
    return sorted(Path(app.config["DIARY_DIR"]).rglob("*.md"))


def test_create_writes_markdown_file_and_index(app, client):
    entry = _create_entry(
        client,
        title="Uma ideia",
        content="Hoje comecei a compreender melhor o que quero construir.",
        tags=["projetos", "ideias"],
    )

    assert ENTRY_ID.fullmatch(entry["id"])
    assert entry["title"] == "Uma ideia"
    assert entry["tags"] == ["projetos", "ideias"]
    assert entry["createdAt"].endswith("Z")
    assert entry["updatedAt"].endswith("Z")

    files = _diary_files(app)
    assert len(files) == 1
    relative = files[0].relative_to(Path(app.config["DIARY_DIR"])).as_posix()
    assert relative.endswith(f"{entry['id']}-uma-ideia.md")

    raw = files[0].read_text(encoding="utf-8")
    assert raw.startswith("---\n")
    header = raw.split("---", 2)[1]
    metadata = yaml.safe_load(header)
    assert metadata["id"] == entry["id"]
    assert metadata["title"] == "Uma ideia"
    assert "Hoje comecei" in raw

    with app.app_context():
        row = db.session.get(DiaryEntry, entry["id"])
        assert row is not None
        assert row.file_path == relative
        assert json.loads(row.tags_json) == ["projetos", "ideias"]


def test_create_without_title_or_tags_preserves_content(app, client):
    content = "Primeira linha.\n\nSegunda linha com ação, coração e café.\nFim."
    entry = _create_entry(client, title=None, content=content, tags=None)

    assert entry["title"] == ""
    assert entry["tags"] == []
    assert entry["content"] == content

    detail = client.get(f"/api/diary/{entry['id']}")
    assert detail.status_code == 200
    assert detail.get_json()["entry"]["content"] == content

    store = DiaryFileStore(app.config["DIARY_DIR"])
    relative = _diary_files(app)[0].relative_to(Path(app.config["DIARY_DIR"])).as_posix()
    assert store.read(relative).content == content


def test_get_and_update_preserve_created_at(app, client):
    entry = _create_entry(client)
    time.sleep(0.01)

    updated = client.patch(
        f"/api/diary/{entry['id']}",
        json={"content": "Texto revisado, com novas ideias.", "tags": ["revisão"]},
    )
    assert updated.status_code == 200
    payload = updated.get_json()["entry"]
    assert payload["createdAt"] == entry["createdAt"]
    assert payload["updatedAt"] != entry["updatedAt"]
    assert payload["content"] == "Texto revisado, com novas ideias."
    assert payload["tags"] == ["revisão"]

    detail = client.get(f"/api/diary/{entry['id']}").get_json()["entry"]
    assert detail["createdAt"] == entry["createdAt"]
    assert detail["content"] == "Texto revisado, com novas ideias."
    assert len(_diary_files(app)) == 1


def test_delete_removes_file_and_index(app, client):
    entry = _create_entry(client)
    path = _diary_files(app)[0]

    response = client.delete(f"/api/diary/{entry['id']}")
    assert response.status_code == 204
    assert not path.exists()
    assert client.get(f"/api/diary/{entry['id']}").status_code == 404

    with app.app_context():
        assert db.session.get(DiaryEntry, entry["id"]) is None


def test_search_matches_title_and_content_case_insensitive(client):
    title_entry = _create_entry(
        client, title="Planejamento do ano", content="Escrevi sobre prioridades."
    )
    content_entry = _create_entry(
        client, title="Tarde tranquila", content="Pensei no meu coração e no futuro."
    )

    by_title = client.get("/api/diary", query_string={"query": "PLANEJAMENTO"})
    assert [item["id"] for item in by_title.get_json()["entries"]] == [title_entry["id"]]

    by_content = client.get("/api/diary", query_string={"query": "CORAÇÃO"})
    assert [item["id"] for item in by_content.get_json()["entries"]] == [
        content_entry["id"]
    ]

    empty = client.get("/api/diary", query_string={"query": "assunto inexistente"})
    assert empty.get_json()["entries"] == []
    assert empty.get_json()["hasMore"] is False


def test_filter_by_month_and_date_range(client):
    entry = _create_entry(client)
    today = date.today()
    month = today.strftime("%Y-%m")

    current = client.get("/api/diary", query_string={"month": month})
    assert [item["id"] for item in current.get_json()["entries"]] == [entry["id"]]

    in_range = client.get(
        "/api/diary",
        query_string={"start": (today - timedelta(days=1)).isoformat(), "end": today.isoformat()},
    )
    assert [item["id"] for item in in_range.get_json()["entries"]] == [entry["id"]]

    tomorrow = (today + timedelta(days=1)).isoformat()
    future = client.get(
        "/api/diary", query_string={"start": tomorrow, "end": tomorrow}
    )
    assert future.get_json()["entries"] == []


def test_pagination_and_filter_validation(client):
    first = _create_entry(client, title="Primeiro", content="Conteúdo um.")
    second = _create_entry(client, title="Segundo", content="Conteúdo dois.")
    third = _create_entry(client, title="Terceiro", content="Conteúdo três.")

    page = client.get("/api/diary", query_string={"limit": 2, "offset": 0})
    body = page.get_json()
    assert len(body["entries"]) == 2
    assert body["hasMore"] is True
    assert {item["id"] for item in body["entries"]} == {second["id"], third["id"]}

    last = client.get("/api/diary", query_string={"limit": 2, "offset": 2})
    assert [item["id"] for item in last.get_json()["entries"]] == [first["id"]]
    assert last.get_json()["hasMore"] is False

    assert client.get("/api/diary", query_string={"limit": 0}).status_code == 422
    assert client.get("/api/diary", query_string={"offset": -1}).status_code == 422
    assert client.get("/api/diary", query_string={"month": "2026-13"}).status_code == 422
    inverted = client.get(
        "/api/diary",
        query_string={"start": "2026-10-10", "end": "2026-10-01"},
    )
    assert inverted.status_code == 422
    assert "start" in inverted.get_json()["error"]["details"]["fields"]


def test_validation_errors(client):
    cases = [
        {"content": "   "},
        {"content": "ok", "title": "x" * 161},
        {"content": "ok", "tags": "pessoal"},
        {"content": "ok", "tags": ["x" * 31]},
        {"content": "ok", "tags": [f"tag{i}" for i in range(11)]},
    ]

    for payload in cases:
        response = client.post("/api/diary", json=payload)
        assert response.status_code == 422
        assert "fields" in response.get_json()["error"]["details"]

    missing_body = client.post("/api/diary", data="", content_type="text/plain")
    assert missing_body.status_code == 422


def test_invalid_and_missing_entry_ids(client):
    assert client.get("/api/diary/nao-existe").status_code == 404
    assert client.get("/api/diary/" + "0" * 32).status_code == 404
    assert client.patch("/api/diary/" + "0" * 32, json={"content": "x"}).status_code == 404
    assert client.delete("/api/diary/" + "0" * 32).status_code == 404


def test_reindex_rebuilds_index_from_markdown(app, client):
    first = _create_entry(client, title="Primeiro", content="Conteúdo um.")
    second = _create_entry(client, title="Segundo", content="Conteúdo dois.")

    with app.app_context():
        db.session.query(DiaryEntry).delete()
        db.session.commit()
        assert db.session.query(DiaryEntry).count() == 0

    reindexed = client.post("/api/diary/reindex")
    assert reindexed.status_code == 200
    result = reindexed.get_json()
    assert result["indexed"] == 2
    assert result["skipped"] == 0
    assert result["errors"] == []

    listed = client.get("/api/diary")
    assert {item["id"] for item in listed.get_json()["entries"]} == {
        first["id"],
        second["id"],
    }


def test_reindex_reports_malformed_files_without_deleting_them(app, client):
    valid = _create_entry(client)
    diary_dir = Path(app.config["DIARY_DIR"])
    broken = diary_dir / "2026" / "10" / "arquivo-quebrado.md"
    broken.parent.mkdir(parents=True, exist_ok=True)
    broken.write_text("sem frontmatter e sem metadados", encoding="utf-8")

    result = client.post("/api/diary/reindex").get_json()
    assert result["indexed"] == 1
    assert result["skipped"] == 1
    assert broken.exists()
    assert result["errors"][0]["file"].endswith("arquivo-quebrado.md")
    assert "sem frontmatter" not in result["errors"][0]["message"]

    listed = client.get("/api/diary").get_json()["entries"]
    assert [item["id"] for item in listed] == [valid["id"]]


def test_automatic_reindex_when_database_is_empty(app, client):
    entry = _create_entry(client)
    with app.app_context():
        db.session.query(DiaryEntry).delete()
        db.session.commit()

    listed = client.get("/api/diary")
    assert listed.status_code == 200
    assert [item["id"] for item in listed.get_json()["entries"]] == [entry["id"]]


def test_file_store_rejects_arbitrary_paths(tmp_path):
    store = DiaryFileStore(tmp_path / "diary")
    for candidate in ["../fora.md", str(tmp_path / "fora.md"), "registro.txt", ""]:
        with pytest.raises(DiaryFileError):
            store.resolve(candidate)

    with pytest.raises(DiaryFileError):
        store.write(
            DiaryDocument(
                id="0" * 32,
                title="",
                content="teste",
                tags=[],
                created_at=datetime.now().astimezone(),
                updated_at=datetime.now().astimezone(),
            ),
            "../fora.md",
        )


def test_update_failure_preserves_file_content(app, client, monkeypatch):
    entry = _create_entry(client, content="Conteúdo original.")
    path = _diary_files(app)[0]

    def fail_write(*_args, **_kwargs):
        raise DiaryFileError("falha simulada")

    monkeypatch.setattr(DiaryFileStore, "write", fail_write)
    response = client.patch(
        f"/api/diary/{entry['id']}", json={"content": "Conteúdo novo."}
    )
    assert response.status_code == 500
    assert response.get_json()["error"]["code"] == "storage_error"
    assert "Conteúdo original." in path.read_text(encoding="utf-8")

    detail = client.get(f"/api/diary/{entry['id']}").get_json()["entry"]
    assert detail["content"] == "Conteúdo original."


def test_entry_persists_after_restart_and_index_rebuilds_after_database_loss(tmp_path):
    database_path = tmp_path / "restart.db"

    def make_app():
        return create_app(
            {
                "TESTING": True,
                "SQLALCHEMY_DATABASE_URI": f"sqlite:///{database_path.as_posix()}",
                "SERVE_FRONTEND": False,
                "DATA_DIR": tmp_path,
                "DIARY_DIR": tmp_path / "diary",
            }
        )

    first_app = make_app()
    with first_app.app_context():
        db.create_all()
    first_client = first_app.test_client()
    entry = _create_entry(first_client, content="Persistir entre reinícios.")

    with first_app.app_context():
        db.session.remove()
        db.engine.dispose()
    database_path.unlink()

    second_app = make_app()
    with second_app.app_context():
        db.create_all()
    second_client = second_app.test_client()

    listed = second_client.get("/api/diary")
    assert [item["id"] for item in listed.get_json()["entries"]] == [entry["id"]]
    detail = second_client.get(f"/api/diary/{entry['id']}")
    assert detail.status_code == 200
    assert detail.get_json()["entry"]["content"] == "Persistir entre reinícios."
