from __future__ import annotations

from datetime import date, timedelta
from pathlib import Path

from app import create_app
from app.core.extensions import db


def _types(client) -> dict[str, dict]:
    response = client.get("/api/media/types")
    assert response.status_code == 200
    return {item["code"]: item for item in response.get_json()["types"]}


def _create_item(client, media_type_id: int, **overrides):
    payload = {
        "typeId": media_type_id,
        "title": "Obra",
        "status": "in_progress",
        "genres": [],
    }
    payload.update(overrides)
    response = client.post("/api/media/items", json=payload)
    assert response.status_code == 201, response.get_json()
    return response.get_json()["item"]


def _add_event(client, item_id: int, **overrides):
    payload = {
        "date": date.today().isoformat(),
        "amount": 1,
    }
    payload.update(overrides)
    response = client.post(f"/api/media/items/{item_id}/events", json=payload)
    assert response.status_code == 201, response.get_json()
    return response.get_json()["event"]


def test_default_media_types_and_custom_type(client):
    types = _types(client)
    assert {"anime", "series", "movie", "book", "manga", "game", "course"} <= set(types)
    assert types["book"]["defaultUnit"] == "page"

    custom = client.post(
        "/api/media/types",
        json={"name": "Audiolivro", "defaultUnit": "hour", "unitLabel": "horas"},
    )
    assert custom.status_code == 201
    media_type = custom.get_json()["type"]
    assert media_type["isSystem"] is False
    assert media_type["defaultUnit"] == "hour"


def test_create_and_filter_media_items(client):
    types = _types(client)
    book = _create_item(
        client,
        types["book"]["id"],
        title="Dom Casmurro",
        creator="Machado de Assis",
        releaseYear=1899,
        totalUnits=300,
        genres=["Clássico", "Romance"],
        status="completed",
        finishedOn="2020-01-15",
        rating=5,
    )
    anime = _create_item(
        client,
        types["anime"]["id"],
        title="Frieren",
        totalUnits=28,
        averageDurationMinutes=24,
        genres=["Fantasia"],
        status="in_progress",
    )

    assert book["genres"] == ["Clássico", "Romance"]
    assert book["progress"]["total"] == 300
    assert anime["type"]["code"] == "anime"

    listed = client.get("/api/media/items").get_json()
    assert listed["total"] == 2

    search = client.get("/api/media/items?query=machado").get_json()
    assert search["total"] == 1
    assert search["items"][0]["title"] == "Dom Casmurro"

    filtered = client.get(
        f"/api/media/items?type={types['anime']['code']}"
    ).get_json()
    assert filtered["total"] == 1
    assert filtered["items"][0]["title"] == "Frieren"

    by_genre = client.get("/api/media/items?genre=Fantasia").get_json()
    assert by_genre["total"] == 1

    completed = client.get("/api/media/items?status=completed").get_json()
    assert completed["total"] == 1
    assert completed["items"][0]["status"] == "completed"

    sorted_items = client.get("/api/media/items?sort=title").get_json()["items"]
    assert [item["title"] for item in sorted_items] == ["Dom Casmurro", "Frieren"]


def test_duplicate_title_same_type_is_rejected(client):
    types = _types(client)
    _create_item(client, types["movie"]["id"], title="Interestelar")
    duplicate = client.post(
        "/api/media/items",
        json={
            "typeId": types["movie"]["id"],
            "title": " interestelar ",
            "status": "want",
        },
    )
    assert duplicate.status_code == 409


def test_consumption_events_update_progress_and_consumption(client):
    types = _types(client)
    book = _create_item(
        client,
        types["book"]["id"],
        title="Livro de Teste",
        totalUnits=300,
        status="in_progress",
    )
    day_one = (date.today() - timedelta(days=2)).isoformat()
    day_two = (date.today() - timedelta(days=1)).isoformat()

    first = _add_event(
        client, book["id"], date=day_one, amount=30, unit="page", note="Primeira sessão"
    )
    assert first["unitLabel"] == "páginas"
    _add_event(client, book["id"], date=day_two, amount=25, unit="page")

    detail = client.get(f"/api/media/items/{book['id']}").get_json()["item"]
    assert detail["progress"]["consumed"] == 55.0
    assert detail["progress"]["current"] == 55.0
    assert detail["progress"]["percent"] == 18.33
    assert detail["consumed"] == [{"unit": "page", "label": "páginas", "amount": 55.0}]
    assert detail["time"]["unknownEvents"] == 2
    assert detail["eventCount"] == 2

    updated = client.patch(
        f"/api/media/events/{first['id']}", json={"amount": 40}
    )
    assert updated.status_code == 200
    assert updated.get_json()["item"]["progress"]["current"] == 65.0

    removed = client.delete(f"/api/media/events/{first['id']}")
    assert removed.status_code == 204
    detail = client.get(f"/api/media/items/{book['id']}").get_json()["item"]
    assert detail["progress"]["current"] == 25.0

    stats = client.get("/api/media/stats").get_json()["stats"]
    assert stats["quantities"] == [
        {"unit": "page", "label": "páginas", "amount": 25.0}
    ]


def test_progress_override_is_separate_from_consumed(client):
    types = _types(client)
    book = _create_item(
        client,
        types["book"]["id"],
        title="Progresso Manual",
        totalUnits=100,
    )
    _add_event(client, book["id"], amount=30, unit="page")

    updated = client.patch(
        f"/api/media/items/{book['id']}", json={"progressOverride": 70}
    )
    item = updated.get_json()["item"]
    assert item["progress"]["consumed"] == 30.0
    assert item["progress"]["override"] == 70.0
    assert item["progress"]["current"] == 70.0
    assert item["consumed"][0]["amount"] == 30.0

    cleared = client.patch(
        f"/api/media/items/{book['id']}", json={"progressOverride": None}
    )
    assert cleared.get_json()["item"]["progress"]["current"] == 30.0


def test_real_and_estimated_time_are_distinct(client):
    types = _types(client)
    series = _create_item(
        client,
        types["series"]["id"],
        title="Série de Teste",
        totalUnits=12,
        averageDurationMinutes=24,
    )
    _add_event(client, series["id"], amount=2, unit="episode")
    _add_event(
        client,
        series["id"],
        amount=2,
        unit="episode",
        durationMinutes=45,
        note="Sessão real",
    )
    _add_event(client, series["id"], amount=30, unit="minute")

    detail = client.get(f"/api/media/items/{series['id']}").get_json()["item"]
    assert detail["time"]["realMinutes"] == 75.0
    assert detail["time"]["estimatedMinutes"] == 48.0
    assert detail["time"]["unknownEvents"] == 0
    assert detail["time"]["totalKnownMinutes"] == 123.0
    assert detail["progress"]["current"] == 4.0

    kinds = {event["timeKind"] for event in detail["events"]}
    assert kinds == {"real", "estimated"}

    stats = client.get("/api/media/stats").get_json()["stats"]
    assert stats["time"]["realMinutes"] == 75.0
    assert stats["time"]["estimatedMinutes"] == 48.0
    assert stats["time"]["unknownEvents"] == 0


def test_unknown_time_is_not_invented(client):
    types = _types(client)
    book = _create_item(
        client,
        types["book"]["id"],
        title="Sem Duração",
        totalUnits=200,
    )
    _add_event(client, book["id"], amount=20, unit="page")
    detail = client.get(f"/api/media/items/{book['id']}").get_json()["item"]
    assert detail["time"]["realMinutes"] == 0.0
    assert detail["time"]["estimatedMinutes"] == 0.0
    assert detail["time"]["unknownEvents"] == 1


def test_completed_items_are_counted_once(client):
    types = _types(client)
    movie = _create_item(
        client,
        types["movie"]["id"],
        title="Filme Concluído",
        status="completed",
        totalUnits=1,
        totalDurationMinutes=120,
    )
    _add_event(client, movie["id"], amount=1, unit="movie")
    _add_event(client, movie["id"], amount=1, unit="movie", isRepeat=True)
    _create_item(
        client,
        types["series"]["id"],
        title="Série Concluída",
        status="completed",
        totalUnits=10,
    )
    _create_item(
        client,
        types["anime"]["id"],
        title="Anime em Andamento",
        status="in_progress",
        totalUnits=24,
    )

    stats = client.get("/api/media/stats").get_json()["stats"]
    assert stats["totals"]["items"] == 3
    assert stats["totals"]["completed"] == 2
    assert stats["totals"]["inProgress"] == 1
    assert stats["totals"]["events"] == 2
    # Revisitas somam consumo, mas não contam a obra concluída novamente.
    assert {
        (entry["unit"], entry["amount"]) for entry in stats["quantities"]
    } == {("movie", 2.0)}


def test_repeat_events_do_not_advance_current_progress(client):
    types = _types(client)
    book = _create_item(
        client,
        types["book"]["id"],
        title="Releitura",
        totalUnits=100,
    )
    _add_event(client, book["id"], amount=30, unit="page")
    _add_event(client, book["id"], amount=20, unit="page", isRepeat=True)
    detail = client.get(f"/api/media/items/{book['id']}").get_json()["item"]
    assert detail["progress"]["consumed"] == 30.0
    assert detail["progress"]["current"] == 30.0
    assert detail["repeatCount"] == 1
    assert detail["consumed"][0]["amount"] == 50.0


def test_stats_filters_period_type_and_genre(client):
    types = _types(client)
    first_day = (date.today() - timedelta(days=40)).isoformat()
    recent_day = date.today().isoformat()

    book = _create_item(
        client,
        types["book"]["id"],
        title="Filtro Livro",
        totalUnits=200,
        genres=["Ensaio"],
    )
    anime = _create_item(
        client,
        types["anime"]["id"],
        title="Filtro Anime",
        totalUnits=12,
        averageDurationMinutes=24,
        genres=["Aventura"],
    )
    _add_event(client, book["id"], date=first_day, amount=10, unit="page")
    _add_event(client, book["id"], date=recent_day, amount=20, unit="page")
    _add_event(client, anime["id"], date=recent_day, amount=2, unit="episode")

    recent_stats = client.get(
        f"/api/media/stats?start={(date.today() - timedelta(days=5)).isoformat()}"
    ).get_json()["stats"]
    assert {
        (entry["unit"], entry["amount"]) for entry in recent_stats["quantities"]
    } == {("page", 20.0), ("episode", 2.0)}
    assert recent_stats["totals"]["events"] == 2

    anime_stats = client.get(
        f"/api/media/stats?type={types['anime']['code']}"
    ).get_json()["stats"]
    assert anime_stats["totals"]["items"] == 1
    assert {
        (entry["unit"], entry["amount"]) for entry in anime_stats["quantities"]
    } == {("episode", 2.0)}
    assert anime_stats["byGenre"] == [{"name": "Aventura", "count": 1}]

    genre_stats = client.get("/api/media/stats?genre=Ensaio").get_json()["stats"]
    assert genre_stats["totals"]["items"] == 1
    assert {
        (entry["unit"], entry["amount"]) for entry in genre_stats["quantities"]
    } == {("page", 30.0)}


def test_event_feed_is_chronological_and_filtered(client):
    types = _types(client)
    movie = _create_item(client, types["movie"]["id"], title="Feed Filme", totalUnits=1)
    book = _create_item(client, types["book"]["id"], title="Feed Livro", totalUnits=50)
    _add_event(
        client,
        movie["id"],
        date=(date.today() - timedelta(days=1)).isoformat(),
        amount=1,
        unit="movie",
    )
    _add_event(client, book["id"], date=date.today().isoformat(), amount=10, unit="page")

    feed = client.get("/api/media/events").get_json()
    assert feed["total"] == 2
    assert [event["item"]["title"] for event in feed["events"]] == [
        "Feed Livro",
        "Feed Filme",
    ]

    filtered = client.get(
        f"/api/media/events?type={types['book']['code']}"
    ).get_json()
    assert filtered["total"] == 1
    assert filtered["events"][0]["item"]["title"] == "Feed Livro"


def test_media_validation_rules(client):
    types = _types(client)
    item = _create_item(
        client, types["book"]["id"], title="Validação", totalUnits=100
    )

    invalid_status = client.post(
        "/api/media/items",
        json={
            "typeId": types["book"]["id"],
            "title": "Status Inválido",
            "status": "lendo",
        },
    )
    assert invalid_status.status_code == 422

    invalid_rating = client.patch(
        f"/api/media/items/{item['id']}", json={"rating": 9}
    )
    assert invalid_rating.status_code == 422

    invalid_override = client.patch(
        f"/api/media/items/{item['id']}", json={"progressOverride": 150}
    )
    assert invalid_override.status_code == 422

    invalid_unit = client.post(
        f"/api/media/items/{item['id']}/events",
        json={
            "date": date.today().isoformat(),
            "amount": 1,
            "unit": "episode",
        },
    )
    assert invalid_unit.status_code == 422

    future = client.post(
        f"/api/media/items/{item['id']}/events",
        json={
            "date": "2999-01-01",
            "amount": 1,
            "unit": "page",
        },
    )
    assert future.status_code == 422

    bad_dates = client.patch(
        f"/api/media/items/{item['id']}",
        json={"startedOn": "2026-05-01", "finishedOn": "2025-01-01"},
    )
    assert bad_dates.status_code == 422


def test_delete_item_cascades_events(client):
    types = _types(client)
    item = _create_item(
        client, types["book"]["id"], title="Excluir", totalUnits=100
    )
    _add_event(client, item["id"], amount=10, unit="page")

    deleted = client.delete(f"/api/media/items/{item['id']}")
    assert deleted.status_code == 204
    assert client.get(f"/api/media/items/{item['id']}").status_code == 404
    stats = client.get("/api/media/stats").get_json()["stats"]
    assert stats["totals"]["events"] == 0
    assert stats["totals"]["items"] == 0


def test_media_data_persists_across_app_instances(tmp_path: Path):
    database_path = tmp_path / "media.db"
    config = {
        "TESTING": True,
        "SQLALCHEMY_DATABASE_URI": f"sqlite:///{database_path.as_posix()}",
        "SERVE_FRONTEND": False,
        "DATA_DIR": tmp_path,
    }

    first_app = create_app(config)
    with first_app.app_context():
        db.create_all()
    first_client = first_app.test_client()
    types = _types(first_client)
    item = _create_item(
        first_client,
        types["book"]["id"],
        title="Persistência de Mídia",
        totalUnits=120,
        genres=["Teste"],
    )
    today = date.today().isoformat()
    _add_event(first_client, item["id"], date=today, amount=15, unit="page")
    with first_app.app_context():
        db.session.remove()

    second_app = create_app(config)
    second_client = second_app.test_client()
    detail = second_client.get(f"/api/media/items/{item['id']}").get_json()["item"]
    assert detail["title"] == "Persistência de Mídia"
    assert detail["genres"] == ["Teste"]
    assert detail["progress"]["current"] == 15.0
    assert len(detail["events"]) == 1
