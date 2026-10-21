from __future__ import annotations

from pathlib import Path

from flask import Flask, abort, send_from_directory


def register_frontend(app: Flask) -> None:
    """Serve o build do Vite quando ele existir (modo produção local)."""
    if not app.config.get("SERVE_FRONTEND"):
        return

    dist = Path(app.config["FRONTEND_DIST"]).resolve()
    if not (dist / "index.html").is_file():
        return

    @app.get("/", defaults={"path": ""})
    @app.get("/<path:path>")
    def serve_frontend(path: str):
        if path.startswith("api/"):
            abort(404)

        candidate = (dist / path).resolve()
        try:
            candidate.relative_to(dist)
        except ValueError:
            abort(404)

        if path and candidate.is_file():
            return send_from_directory(dist, path)

        return send_from_directory(dist, "index.html")
