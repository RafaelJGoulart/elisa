from __future__ import annotations

from typing import Any

from flask import Flask, jsonify
from werkzeug.exceptions import HTTPException


class AppError(Exception):
    status_code = 400
    code = "bad_request"

    def __init__(self, message: str, details: Any | None = None) -> None:
        super().__init__(message)
        self.message = message
        self.details = details


class ValidationError(AppError):
    status_code = 422
    code = "validation_error"


class NotFoundError(AppError):
    status_code = 404
    code = "not_found"


class ConflictError(AppError):
    status_code = 409
    code = "conflict"


class StorageError(AppError):
    status_code = 500
    code = "storage_error"


def _error_response(message: str, code: str, status: int, details: Any | None = None):
    body: dict[str, Any] = {"error": {"code": code, "message": message}}
    if details is not None:
        body["error"]["details"] = details
    return jsonify(body), status


def register_error_handlers(app: Flask) -> None:
    @app.errorhandler(AppError)
    def handle_app_error(error: AppError):
        return _error_response(error.message, error.code, error.status_code, error.details)

    @app.errorhandler(HTTPException)
    def handle_http_error(error: HTTPException):
        if error.code == 404:
            return _error_response("Recurso não encontrado.", "not_found", 404)
        if error.code == 405:
            return _error_response(
                "Método não permitido para este recurso.", "method_not_allowed", 405
            )
        return _error_response(
            error.description or "Não foi possível concluir a solicitação.",
            "http_error",
            error.code or 500,
        )

    @app.errorhandler(Exception)
    def handle_unexpected_error(error: Exception):
        app.logger.exception("Erro inesperado: %s", error)
        return _error_response(
            "Ocorreu um erro interno. Tente novamente.", "internal_error", 500
        )
