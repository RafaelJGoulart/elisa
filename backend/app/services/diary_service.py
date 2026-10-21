from __future__ import annotations

import calendar
import json
import re
import uuid
from datetime import date, datetime, timezone
from pathlib import Path
from typing import Any

from flask import current_app

from app.core.errors import NotFoundError, StorageError, ValidationError
from app.models import DiaryEntry
from app.repositories import diary_repository as repository
from app.repositories.diary_file_store import (
    DiaryDocument,
    DiaryFileError,
    DiaryFileStore,
    is_valid_entry_id,
)

MAX_TITLE = 160
MAX_CONTENT = 100_000
MAX_TAGS = 10
MAX_TAG_LENGTH = 30
MAX_QUERY = 200
DEFAULT_LIMIT = 20
MAX_LIMIT = 100
EXCERPT_LENGTH = 180
DATE_FORMAT = "%Y-%m-%d"
MONTH_PATTERN = re.compile(r"^\d{4}-\d{2}$")


def _store() -> DiaryFileStore:
    return DiaryFileStore(Path(current_app.config["DIARY_DIR"]))


def _now_local() -> datetime:
    return datetime.now().astimezone()


def _as_utc(value: datetime) -> datetime:
    if value.tzinfo is None:
        value = value.replace(tzinfo=timezone.utc)
    return value.astimezone(timezone.utc)


def _parse_date(value: Any, field: str) -> date | None:
    if value is None or value == "":
        return None
    if not isinstance(value, str):
        raise ValidationError(
            "Data inválida.", {"fields": {field: "Use o formato AAAA-MM-DD."}}
        )
    try:
        return datetime.strptime(value, DATE_FORMAT).date()
    except ValueError as error:
        raise ValidationError(
            "Data inválida.", {"fields": {field: "Use o formato AAAA-MM-DD."}}
        ) from error


def _month_range(value: str) -> tuple[date, date]:
    if not MONTH_PATTERN.fullmatch(value):
        raise ValidationError(
            "Mês inválido.", {"fields": {"month": "Use o formato AAAA-MM."}}
        )
    year, month = (int(part) for part in value.split("-"))
    try:
        start = date(year, month, 1)
    except ValueError as error:
        raise ValidationError(
            "Mês inválido.", {"fields": {"month": "Informe um mês válido."}}
        ) from error
    last_day = calendar.monthrange(year, month)[1]
    return start, date(year, month, last_day)


def _resolve_range(
    month: Any, start_raw: Any, end_raw: Any
) -> tuple[date | None, date | None]:
    if month is not None and month != "":
        if not isinstance(month, str):
            raise ValidationError(
                "Mês inválido.", {"fields": {"month": "Use o formato AAAA-MM."}}
            )
        return _month_range(month)

    start = _parse_date(start_raw, "start")
    end = _parse_date(end_raw, "end")
    if start is not None and end is not None and start > end:
        raise ValidationError(
            "O início do período deve ser anterior ao fim.",
            {"fields": {"start": "Data inicial posterior à final."}},
        )
    return start, end


def _validate_payload(payload: Any, *, partial: bool = False) -> dict[str, Any]:
    if not isinstance(payload, dict):
        raise ValidationError("Envie um objeto JSON válido.")

    fields: dict[str, str] = {}
    cleaned: dict[str, Any] = {}

    if not partial or "title" in payload:
        title_raw = payload.get("title")
        if title_raw is None:
            cleaned["title"] = ""
        elif not isinstance(title_raw, str):
            fields["title"] = "O título deve ser um texto."
        else:
            title = title_raw.strip()
            if len(title) > MAX_TITLE:
                fields["title"] = f"Use no máximo {MAX_TITLE} caracteres."
            else:
                cleaned["title"] = title

    if not partial or "content" in payload:
        content_raw = payload.get("content")
        if not isinstance(content_raw, str):
            fields["content"] = "Escreva o conteúdo do registro."
        else:
            content = content_raw.replace("\r\n", "\n").replace("\r", "\n")
            if not content.strip():
                fields["content"] = "Escreva algo antes de salvar."
            elif len(content) > MAX_CONTENT:
                fields["content"] = f"Use no máximo {MAX_CONTENT} caracteres."
            else:
                cleaned["content"] = content

    if not partial or "tags" in payload:
        tags_raw = payload.get("tags")
        if tags_raw is None:
            cleaned["tags"] = []
        elif not isinstance(tags_raw, list):
            fields["tags"] = "As etiquetas devem ser uma lista de textos."
        else:
            tags: list[str] = []
            seen: set[str] = set()
            for raw in tags_raw:
                if not isinstance(raw, str):
                    fields["tags"] = "As etiquetas devem ser uma lista de textos."
                    break
                tag = raw.strip()
                if not tag:
                    continue
                if len(tag) > MAX_TAG_LENGTH:
                    fields["tags"] = (
                        f"Cada etiqueta pode ter no máximo {MAX_TAG_LENGTH} caracteres."
                    )
                    break
                key = tag.casefold()
                if key in seen:
                    continue
                seen.add(key)
                tags.append(tag)
            if len(tags) > MAX_TAGS:
                fields["tags"] = f"Use no máximo {MAX_TAGS} etiquetas."
            if "tags" not in fields:
                cleaned["tags"] = tags

    if fields:
        raise ValidationError("Revise os campos informados.", {"fields": fields})

    if partial and not cleaned:
        raise ValidationError(
            "Nenhuma alteração foi informada.",
            {"fields": {"content": "Altere o título, o texto ou as etiquetas."}},
        )

    return cleaned


def _normalize_filters(
    query: Any, month: Any, start_raw: Any, end_raw: Any, limit: Any, offset: Any
) -> tuple[str, date | None, date | None, int, int]:
    normalized_query = ""
    if query is not None and query != "":
        if not isinstance(query, str):
            raise ValidationError(
                "Busca inválida.", {"fields": {"query": "Informe um texto para buscar."}}
            )
        normalized_query = query.strip()
        if len(normalized_query) > MAX_QUERY:
            raise ValidationError(
                "Busca muito longa.",
                {"fields": {"query": f"Use no máximo {MAX_QUERY} caracteres."}},
            )

    start, end = _resolve_range(month, start_raw, end_raw)

    try:
        parsed_limit = int(limit)
    except (TypeError, ValueError) as error:
        raise ValidationError(
            "Limite inválido.", {"fields": {"limit": "Informe um número inteiro."}}
        ) from error
    if parsed_limit < 1 or parsed_limit > MAX_LIMIT:
        raise ValidationError(
            "Limite inválido.",
            {"fields": {"limit": f"Use um valor entre 1 e {MAX_LIMIT}."}},
        )

    try:
        parsed_offset = int(offset)
    except (TypeError, ValueError) as error:
        raise ValidationError(
            "Deslocamento inválido.",
            {"fields": {"offset": "Informe um número inteiro."}},
        ) from error
    if parsed_offset < 0:
        raise ValidationError(
            "Deslocamento inválido.",
            {"fields": {"offset": "O valor não pode ser negativo."}},
        )

    return normalized_query, start, end, parsed_limit, parsed_offset


def _excerpt(content: str) -> str:
    text = " ".join(content.split())
    if len(text) <= EXCERPT_LENGTH:
        return text
    return f"{text[: EXCERPT_LENGTH - 1].rstrip()}…"


def _apply_row(row: DiaryEntry, document: DiaryDocument, file_path: str) -> None:
    row.id = document.id
    row.file_path = file_path
    row.title = document.title
    row.entry_date = document.created_at.date()
    row.created_at = _as_utc(document.created_at)
    row.updated_at = _as_utc(document.updated_at)
    row.tags_json = json.dumps(document.tags, ensure_ascii=False)


def _new_row(document: DiaryDocument, file_path: str) -> DiaryEntry:
    row = DiaryEntry(
        id=document.id,
        file_path=file_path,
        title=document.title,
        entry_date=document.created_at.date(),
        created_at=_as_utc(document.created_at),
        updated_at=_as_utc(document.updated_at),
        tags_json=json.dumps(document.tags, ensure_ascii=False),
    )
    return row


def _commit(
    message: str = (
        "O arquivo do Diário foi gravado, mas o índice não pôde ser atualizado. "
        "Reindexe o Diário."
    ),
) -> None:
    try:
        repository.commit()
    except Exception as error:
        raise StorageError(message) from error


def _read_row(row: DiaryEntry, store: DiaryFileStore) -> DiaryDocument:
    try:
        return store.read(row.file_path)
    except DiaryFileError as error:
        if isinstance(error.__cause__, FileNotFoundError):
            raise NotFoundError("Registro não encontrado.") from error
        raise StorageError(
            "Não foi possível ler este registro. O arquivo pode estar malformado."
        ) from error


def _ensure_index(store: DiaryFileStore) -> None:
    if repository.count_entries() == 0 and store.has_files():
        rebuild_index()


def create_entry(payload: Any) -> DiaryDocument:
    cleaned = _validate_payload(payload)
    store = _store()
    now = _now_local()
    entry_id = uuid.uuid4().hex
    document = DiaryDocument(
        id=entry_id,
        title=cleaned["title"],
        content=cleaned["content"],
        tags=cleaned["tags"],
        created_at=now,
        updated_at=now,
    )
    relative_path = store.relative_path_for(entry_id, now, document.title)

    try:
        store.write(document, relative_path)
    except DiaryFileError as error:
        raise StorageError(
            "Não foi possível gravar o registro no Diário."
        ) from error

    repository.add_entry(_new_row(document, relative_path))
    _commit()
    return document


def get_entry(entry_id: str) -> DiaryDocument:
    if not is_valid_entry_id(entry_id):
        raise NotFoundError("Registro não encontrado.")

    store = _store()
    _ensure_index(store)
    row = repository.get_entry(entry_id)
    if row is None:
        raise NotFoundError("Registro não encontrado.")
    return _read_row(row, store)


def list_entries(
    *,
    query: Any = None,
    month: Any = None,
    start: Any = None,
    end: Any = None,
    limit: Any = DEFAULT_LIMIT,
    offset: Any = 0,
) -> dict[str, Any]:
    normalized_query, start_date, end_date, parsed_limit, parsed_offset = (
        _normalize_filters(query, month, start, end, limit, offset)
    )
    store = _store()
    _ensure_index(store)

    needle = normalized_query.casefold()
    summaries: list[dict[str, Any]] = []
    matched = 0
    has_more = False

    for row in repository.iter_entries(start_date, end_date):
        try:
            document = store.read(row.file_path)
        except DiaryFileError:
            current_app.logger.warning(
                "Registro do Diário ignorado durante a listagem: %s", row.id
            )
            continue

        if needle:
            haystack = "\n".join(
                [document.title, document.content, " ".join(document.tags)]
            ).casefold()
            if needle not in haystack:
                continue

        if matched < parsed_offset:
            matched += 1
            continue

        if len(summaries) >= parsed_limit:
            has_more = True
            break

        summaries.append({"document": document, "excerpt": _excerpt(document.content)})
        matched += 1

    return {
        "entries": summaries,
        "hasMore": has_more,
        "limit": parsed_limit,
        "offset": parsed_offset,
    }


def update_entry(entry_id: str, payload: Any) -> DiaryDocument:
    if not is_valid_entry_id(entry_id):
        raise NotFoundError("Registro não encontrado.")

    cleaned = _validate_payload(payload, partial=True)
    store = _store()
    _ensure_index(store)
    row = repository.get_entry(entry_id)
    if row is None:
        raise NotFoundError("Registro não encontrado.")

    current = _read_row(row, store)
    document = DiaryDocument(
        id=current.id,
        title=cleaned.get("title", current.title),
        content=cleaned.get("content", current.content),
        tags=cleaned.get("tags", current.tags),
        created_at=current.created_at,
        updated_at=_now_local(),
    )

    try:
        store.write(document, row.file_path)
    except DiaryFileError as error:
        raise StorageError(
            "Não foi possível atualizar o arquivo do registro."
        ) from error

    _apply_row(row, document, row.file_path)
    _commit()
    return document


def delete_entry(entry_id: str) -> None:
    if not is_valid_entry_id(entry_id):
        raise NotFoundError("Registro não encontrado.")

    store = _store()
    _ensure_index(store)
    row = repository.get_entry(entry_id)
    if row is None:
        raise NotFoundError("Registro não encontrado.")

    try:
        store.delete(row.file_path)
    except DiaryFileError as error:
        raise StorageError(
            "Não foi possível excluir o arquivo do registro."
        ) from error

    repository.delete_entry(row)
    _commit(
        "O arquivo foi removido, mas o índice não pôde ser atualizado. "
        "Reindexe o Diário."
    )


def rebuild_index() -> dict[str, Any]:
    store = _store()
    documents, errors, existing_paths = store.scan()
    previous = {row.file_path: row for row in repository.list_all_entries()}
    seen_ids: set[str] = set()
    indexed = 0

    for file_path, document in documents:
        if document.id in seen_ids:
            errors.append(
                {
                    "file": file_path,
                    "message": "Identificador duplicado; o arquivo foi ignorado.",
                }
            )
            continue
        seen_ids.add(document.id)

        row = previous.get(file_path) or repository.get_entry(document.id)
        if row is None:
            repository.add_entry(_new_row(document, file_path))
        else:
            _apply_row(row, document, file_path)
        indexed += 1

    for file_path, row in previous.items():
        if file_path in existing_paths:
            continue
        if row.id in seen_ids:
            continue
        repository.delete_entry(row)

    _commit()
    return {
        "indexed": indexed,
        "skipped": len(errors),
        "errors": errors,
    }
