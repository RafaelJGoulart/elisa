from __future__ import annotations

from typing import Any

from flask import Blueprint, jsonify, request

from app.api.serializers import serialize_diary_entry, serialize_diary_summary
from app.core.errors import ValidationError
from app.services import diary_service

diary_bp = Blueprint("diary", __name__, url_prefix="/api")


def _json_body() -> dict[str, Any]:
    payload = request.get_json(silent=True)
    if payload is None:
        raise ValidationError(
            "Envie um corpo JSON com Content-Type application/json."
        )
    return payload


@diary_bp.get("/diary")
def list_diary_entries():
    result = diary_service.list_entries(
        query=request.args.get("query"),
        month=request.args.get("month"),
        start=request.args.get("start"),
        end=request.args.get("end"),
        limit=request.args.get("limit", diary_service.DEFAULT_LIMIT),
        offset=request.args.get("offset", 0),
    )
    return jsonify(
        {
            "entries": [
                serialize_diary_summary(item["document"], item["excerpt"])
                for item in result["entries"]
            ],
            "hasMore": result["hasMore"],
            "limit": result["limit"],
            "offset": result["offset"],
        }
    )


@diary_bp.post("/diary")
def create_diary_entry():
    document = diary_service.create_entry(_json_body())
    return jsonify({"entry": serialize_diary_entry(document, include_content=True)}), 201


@diary_bp.post("/diary/reindex")
def reindex_diary():
    return jsonify(diary_service.rebuild_index())


@diary_bp.get("/diary/<entry_id>")
def get_diary_entry(entry_id: str):
    document = diary_service.get_entry(entry_id)
    return jsonify({"entry": serialize_diary_entry(document, include_content=True)})


@diary_bp.patch("/diary/<entry_id>")
def update_diary_entry(entry_id: str):
    document = diary_service.update_entry(entry_id, _json_body())
    return jsonify({"entry": serialize_diary_entry(document, include_content=True)})


@diary_bp.delete("/diary/<entry_id>")
def delete_diary_entry(entry_id: str):
    diary_service.delete_entry(entry_id)
    return "", 204
