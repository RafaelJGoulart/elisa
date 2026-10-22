from __future__ import annotations

from typing import Any

from flask import Blueprint, jsonify, request

from app.api.serializers import (
    serialize_genre,
    serialize_media_event,
    serialize_media_item,
    serialize_media_type,
)
from app.core.errors import ValidationError
from app.services import media_service

media_bp = Blueprint("media", __name__, url_prefix="/api/media")


def _json_body() -> dict[str, Any]:
    payload = request.get_json(silent=True)
    if payload is None:
        raise ValidationError(
            "Envie um corpo JSON com Content-Type application/json."
        )
    return payload


def _int_arg(name: str, default: int, minimum: int, maximum: int) -> int:
    raw = request.args.get(name)
    if raw is None or raw == "":
        return default
    try:
        value = int(raw)
    except ValueError as error:
        raise ValidationError(
            "Parâmetro inválido.", {"fields": {name: "Use um número inteiro."}}
        ) from error
    return max(minimum, min(value, maximum))


@media_bp.get("/types")
def list_types():
    types = media_service.list_types()
    return jsonify({"types": [serialize_media_type(item) for item in types]})


@media_bp.post("/types")
def create_type():
    media_type = media_service.create_media_type(_json_body())
    return jsonify({"type": serialize_media_type(media_type)}), 201


@media_bp.get("/genres")
def list_genres():
    genres = media_service.list_genres()
    return jsonify({"genres": [serialize_genre(item) for item in genres]})


@media_bp.get("/items")
def list_items():
    result = media_service.list_items(
        query=request.args.get("query"),
        type_code=request.args.get("type"),
        status=request.args.get("status"),
        genre=request.args.get("genre"),
        sort=request.args.get("sort", "recent"),
        limit=_int_arg("limit", 24, 1, 100),
        offset=_int_arg("offset", 0, 0, 10_000_000),
        include_archived=request.args.get("includeArchived", "false").lower()
        in {"1", "true", "yes"},
    )
    return jsonify(
        {
            "items": [
                serialize_media_item(
                    row["item"], aggregates=row["aggregates"]
                )
                for row in result["items"]
            ],
            "total": result["total"],
            "limit": result["limit"],
            "offset": result["offset"],
        }
    )


@media_bp.post("/items")
def create_item():
    item = media_service.create_item(_json_body())
    return (
        jsonify(
            {
                "item": serialize_media_item(
                    item, aggregates=media_service.compute_item_aggregates(item)
                )
            }
        ),
        201,
    )


@media_bp.get("/items/<int:item_id>")
def get_item(item_id: int):
    item = media_service.get_item(item_id)
    return jsonify(
        {
            "item": serialize_media_item(
                item,
                aggregates=media_service.compute_item_aggregates(item),
                include_events=True,
            )
        }
    )


@media_bp.patch("/items/<int:item_id>")
def update_item(item_id: int):
    item = media_service.update_item(item_id, _json_body())
    return jsonify(
        {
            "item": serialize_media_item(
                item,
                aggregates=media_service.compute_item_aggregates(item),
                include_events=True,
            )
        }
    )


@media_bp.delete("/items/<int:item_id>")
def delete_item(item_id: int):
    media_service.delete_item(item_id)
    return "", 204


@media_bp.get("/items/<int:item_id>/events")
def list_item_events(item_id: int):
    item = media_service.get_item(item_id)
    return jsonify(
        {
            "events": [
                serialize_media_event(event, item=item) for event in item.events
            ]
        }
    )


@media_bp.post("/items/<int:item_id>/events")
def create_item_event(item_id: int):
    event = media_service.create_event(item_id, _json_body())
    item = media_service.get_item(item_id)
    return (
        jsonify(
            {
                "event": serialize_media_event(event, item=item),
                "item": serialize_media_item(
                    item, aggregates=media_service.compute_item_aggregates(item)
                ),
            }
        ),
        201,
    )


@media_bp.get("/events")
def list_events():
    result = media_service.list_events(
        start=request.args.get("start"),
        end=request.args.get("end"),
        type_code=request.args.get("type"),
        genre=request.args.get("genre"),
        limit=_int_arg("limit", 30, 1, 100),
        offset=_int_arg("offset", 0, 0, 10_000_000),
    )
    return jsonify(
        {
            "events": [serialize_media_event(event) for event in result["events"]],
            "total": result["total"],
        }
    )


@media_bp.patch("/events/<int:event_id>")
def update_event(event_id: int):
    event = media_service.update_event(event_id, _json_body())
    item = event.media_item
    return jsonify(
        {
            "event": serialize_media_event(event, item=item),
            "item": serialize_media_item(
                item, aggregates=media_service.compute_item_aggregates(item)
            ),
        }
    )


@media_bp.delete("/events/<int:event_id>")
def delete_event(event_id: int):
    media_service.delete_event(event_id)
    return "", 204


@media_bp.get("/stats")
def get_stats():
    stats = media_service.get_stats(
        start=request.args.get("start"),
        end=request.args.get("end"),
        type_code=request.args.get("type"),
        genre=request.args.get("genre"),
    )
    recent = stats.pop("recentEventsSource", [])
    stats["recentEvents"] = [serialize_media_event(event) for event in recent]
    return jsonify({"stats": stats})
