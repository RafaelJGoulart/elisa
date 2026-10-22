from __future__ import annotations

from flask import Blueprint, jsonify

from app.api.serializers import serialize_xp_event
from app.services import xp_service

profile_bp = Blueprint("profile", __name__, url_prefix="/api")


@profile_bp.get("/profile")
def get_profile():
    summary = xp_service.build_profile()
    progression = summary.progression
    return jsonify(
        {
            "profile": {
                "level": progression.level,
                "totalXp": progression.total_xp,
                "currentLevelTotalXp": progression.current_level_total_xp,
                "nextLevelTotalXp": progression.next_level_total_xp,
                "xpIntoLevel": progression.xp_into_level,
                "xpToNextLevel": progression.xp_to_next_level,
                "xpForNextLevel": progression.xp_for_next_level,
                "progressPercent": progression.progress_percent,
                "stats": {
                    "habitOccurrences": summary.habit_occurrences,
                    "habitWeeks": summary.habit_weeks,
                    "habitXp": summary.habit_xp,
                },
                "categories": summary.categories,
                "recentEvents": [
                    serialize_xp_event(event) for event in summary.recent_events
                ],
            }
        }
    )
