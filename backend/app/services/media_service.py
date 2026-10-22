from __future__ import annotations

import re
import unicodedata
from datetime import date, datetime, timedelta
from decimal import Decimal, InvalidOperation, ROUND_HALF_UP
from typing import Any, Iterable

from app.core.errors import ConflictError, NotFoundError, ValidationError
from app.models import Genre, MediaConsumptionEvent, MediaItem, MediaType
from app.repositories import media_repository as repository

VALID_STATUSES = {"want", "in_progress", "completed", "paused", "dropped"}
VALID_SORTS = {"recent", "title", "created", "rating", "year"}
DATE_FORMAT = "%Y-%m-%d"
MAX_STATS_DAYS = 3650
QUANTIZE = Decimal("0.001")

DEFAULT_UNIT_LABELS = {
    "episode": "episódios",
    "page": "páginas",
    "chapter": "capítulos",
    "volume": "volumes",
    "movie": "filmes",
    "documentary": "documentários",
    "lesson": "aulas",
    "hour": "horas",
    "minute": "minutos",
    "unit": "unidades",
}

DEFAULT_TYPES: tuple[dict[str, Any], ...] = (
    {
        "code": "anime",
        "name": "Anime",
        "default_unit": "episode",
        "unit_label": "episódios",
    },
    {
        "code": "series",
        "name": "Série",
        "default_unit": "episode",
        "unit_label": "episódios",
    },
    {
        "code": "movie",
        "name": "Filme",
        "default_unit": "movie",
        "unit_label": "filmes",
    },
    {
        "code": "book",
        "name": "Livro",
        "default_unit": "page",
        "unit_label": "páginas",
    },
    {
        "code": "manga",
        "name": "Mangá",
        "default_unit": "chapter",
        "unit_label": "capítulos",
    },
    {
        "code": "comic",
        "name": "Quadrinho / HQ",
        "default_unit": "chapter",
        "unit_label": "capítulos",
    },
    {
        "code": "light_novel",
        "name": "Light novel",
        "default_unit": "page",
        "unit_label": "páginas",
    },
    {
        "code": "game",
        "name": "Jogo",
        "default_unit": "hour",
        "unit_label": "horas",
    },
    {
        "code": "documentary",
        "name": "Documentário",
        "default_unit": "documentary",
        "unit_label": "documentários",
    },
    {
        "code": "course",
        "name": "Curso",
        "default_unit": "lesson",
        "unit_label": "aulas",
    },
    {
        "code": "podcast",
        "name": "Podcast",
        "default_unit": "episode",
        "unit_label": "episódios",
    },
    {
        "code": "other",
        "name": "Outro",
        "default_unit": "unit",
        "unit_label": "unidades",
    },
)

TYPE_UNITS: dict[str, tuple[str, ...]] = {
    "anime": ("episode", "minute", "hour"),
    "series": ("episode", "minute", "hour"),
    "movie": ("movie", "minute"),
    "documentary": ("documentary", "minute"),
    "book": ("page", "chapter", "minute"),
    "light_novel": ("page", "chapter", "minute"),
    "manga": ("chapter", "volume", "page", "minute"),
    "comic": ("chapter", "volume", "page", "minute"),
    "game": ("hour", "minute"),
    "course": ("lesson", "minute", "hour"),
    "podcast": ("episode", "minute", "hour"),
    "other": ("unit", "minute", "hour"),
}

CUSTOM_UNITS = ("unit", "episode", "page", "chapter", "movie", "lesson", "hour", "minute")


def _utc_now() -> datetime:
    return datetime.now()


def _slug(value: str) -> str:
    normalized = unicodedata.normalize("NFKD", value)
    ascii_value = normalized.encode("ascii", "ignore").decode("ascii").lower()
    return re.sub(r"[^a-z0-9]+", "-", ascii_value).strip("-") or "tipo"


def ensure_default_types() -> None:
    existing = {media_type.code for media_type in repository.list_media_types()}
    changed = False
    for item in DEFAULT_TYPES:
        if item["code"] in existing:
            continue
        repository.add_media_type(MediaType(is_system=True, **item))
        changed = True
    if changed:
        repository.commit()


def list_types() -> list[MediaType]:
    ensure_default_types()
    return repository.list_media_types()


def list_genres() -> list[Genre]:
    return repository.list_genres()


def _require_type(type_id: int) -> MediaType:
    media_type = repository.get_media_type(type_id)
    if media_type is None:
        raise NotFoundError("Tipo de mídia não encontrado.")
    return media_type


def get_item(item_id: int) -> MediaItem:
    item = repository.get_item(item_id)
    if item is None:
        raise NotFoundError("Item de mídia não encontrado.")
    return item


def unit_label(item: MediaItem, unit: str) -> str:
    if unit == "unit":
        return item.unit_label or item.media_type.unit_label or "unidades"
    return DEFAULT_UNIT_LABELS.get(unit, unit)


def allowed_units_for(media_type: MediaType, item_unit_label: str | None = None) -> tuple[str, ...]:
    units = list(TYPE_UNITS.get(media_type.code, CUSTOM_UNITS))
    if media_type.default_unit not in units:
        units.insert(0, media_type.default_unit)
    return tuple(dict.fromkeys(units))


def allowed_units(item: MediaItem) -> tuple[str, ...]:
    return allowed_units_for(item.media_type, item.unit_label)


def _parse_int(
    value: Any, field: str, *, minimum: int = 0, maximum: int = 1000000
) -> int:
    if isinstance(value, bool) or value is None:
        raise ValidationError(
            "Valor inválido.", {"fields": {field: "Informe um número inteiro."}}
        )
    try:
        number = int(value)
    except (TypeError, ValueError) as error:
        raise ValidationError(
            "Valor inválido.", {"fields": {field: "Informe um número inteiro."}}
        ) from error
    if str(value).strip() not in {str(number), str(number) + ".0"} and not isinstance(
        value, int
    ):
        # Aceita "12" e 12; rejeita "12.5".
        try:
            decimal_value = Decimal(str(value))
        except InvalidOperation as error:
            raise ValidationError(
                "Valor inválido.",
                {"fields": {field: "Informe um número inteiro."}},
            ) from error
        if decimal_value != decimal_value.to_integral_value():
            raise ValidationError(
                "Valor inválido.",
                {"fields": {field: "Informe um número inteiro."}},
            )
    if number < minimum or number > maximum:
        raise ValidationError(
            "Valor fora do intervalo.",
            {"fields": {field: "Use um valor válido."}},
        )
    return number


def _parse_optional_int(
    value: Any,
    field: str,
    *,
    minimum: int = 1,
    maximum: int = 1000000,
) -> int | None:
    if value is None or value == "":
        return None
    return _parse_int(value, field, minimum=minimum, maximum=maximum)


def _parse_decimal(
    value: Any, field: str, *, minimum: Decimal = Decimal("0")
) -> Decimal:
    if isinstance(value, bool) or value is None:
        raise ValidationError(
            "Valor inválido.", {"fields": {field: "Informe um número válido."}}
        )
    try:
        number = Decimal(str(value).replace(",", "."))
    except (InvalidOperation, ValueError) as error:
        raise ValidationError(
            "Valor inválido.", {"fields": {field: "Informe um número válido."}}
        ) from error
    if not number.is_finite() or number < minimum:
        raise ValidationError(
            "Valor inválido.",
            {"fields": {field: "Use um número maior ou igual a zero."}},
        )
    return number.quantize(QUANTIZE, rounding=ROUND_HALF_UP)


def _parse_optional_decimal(
    value: Any, field: str, *, minimum: Decimal = Decimal("0")
) -> Decimal | None:
    if value is None or value == "":
        return None
    return _parse_decimal(value, field, minimum=minimum)


def _parse_optional_date(value: Any, field: str) -> date | None:
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


def _parse_text(
    value: Any, field: str, *, label: str, maximum: int, required: bool = False
) -> str | None:
    if value is None:
        if required:
            raise ValidationError(
                "Campo obrigatório.", {"fields": {field: f"Informe {label}."}}
            )
        return None
    if not isinstance(value, str):
        raise ValidationError(
            "Texto inválido.", {"fields": {field: "Informe um texto."}}
        )
    cleaned = value.strip()
    if required and not cleaned:
        raise ValidationError(
            "Campo obrigatório.", {"fields": {field: f"Informe {label}."}}
        )
    if len(cleaned) > maximum:
        raise ValidationError(
            "Texto longo demais.",
            {"fields": {field: f"Use no máximo {maximum} caracteres."}},
        )
    return cleaned or None


def _parse_genres(value: Any) -> list[str]:
    if value is None:
        return []
    raw_items: list[Any]
    if isinstance(value, str):
        raw_items = value.split(",")
    elif isinstance(value, list):
        raw_items = value
    else:
        raise ValidationError(
            "Gêneros inválidos.",
            {"fields": {"genres": "Envie uma lista de gêneros."}},
        )

    genres: list[str] = []
    seen: set[str] = set()
    for raw in raw_items:
        if not isinstance(raw, str):
            raise ValidationError(
                "Gênero inválido.",
                {"fields": {"genres": "Cada gênero deve ser um texto."}},
            )
        name = raw.strip()
        if not name:
            continue
        if len(name) > 40:
            raise ValidationError(
                "Gênero longo demais.",
                {"fields": {"genres": "Use no máximo 40 caracteres por gênero."}},
            )
        key = name.casefold()
        if key in seen:
            continue
        seen.add(key)
        genres.append(name)

    if len(genres) > 10:
        raise ValidationError(
            "Muitos gêneros.",
            {"fields": {"genres": "Use no máximo 10 gêneros."}},
        )
    return genres


def _validate_item_payload(
    payload: Any, *, partial: bool = False, current: MediaItem | None = None
) -> tuple[dict[str, Any], list[str] | None]:
    ensure_default_types()
    if not isinstance(payload, dict):
        raise ValidationError("Envie um objeto JSON válido.")

    cleaned: dict[str, Any] = {}
    fields: dict[str, str] = {}
    genres: list[str] | None = None

    type_id: int | None
    if not partial or "typeId" in payload:
        raw_type = payload.get("typeId")
        try:
            type_id = _parse_int(raw_type, "typeId", minimum=1, maximum=1000000)
        except ValidationError as error:
            fields.update(error.details["fields"] if error.details else {})
            type_id = None
        else:
            cleaned["media_type_id"] = type_id
    else:
        type_id = current.media_type_id if current else None

    if not partial or "title" in payload:
        title = _parse_text(
            payload.get("title"), "title", label="um título", maximum=200, required=True
        )
        if title is not None:
            cleaned["title"] = title

    if not partial or "alternateTitle" in payload:
        cleaned["alternate_title"] = _parse_text(
            payload.get("alternateTitle"),
            "alternateTitle",
            label="um título alternativo",
            maximum=200,
        )

    if not partial or "description" in payload:
        cleaned["description"] = _parse_text(
            payload.get("description"),
            "description",
            label="uma descrição",
            maximum=2000,
        )

    if not partial or "creator" in payload:
        cleaned["creator"] = _parse_text(
            payload.get("creator"),
            "creator",
            label="um criador",
            maximum=160,
        )

    if not partial or "notes" in payload:
        cleaned["notes"] = _parse_text(
            payload.get("notes"), "notes", label="observações", maximum=2000
        )

    if not partial or "releaseYear" in payload:
        try:
            cleaned["release_year"] = _parse_optional_int(
                payload.get("releaseYear"),
                "releaseYear",
                minimum=1,
                maximum=3000,
            )
        except ValidationError as error:
            fields.update(error.details["fields"] if error.details else {})

    for payload_key, column, maximum in (
        ("totalUnits", "total_units", 1000000),
        ("totalVolumes", "total_volumes", 100000),
        ("averageDurationMinutes", "average_duration_minutes", 100000),
        ("totalDurationMinutes", "total_duration_minutes", 1000000),
    ):
        if not partial or payload_key in payload:
            try:
                cleaned[column] = _parse_optional_int(
                    payload.get(payload_key),
                    payload_key,
                    minimum=1,
                    maximum=maximum,
                )
            except ValidationError as error:
                fields.update(error.details["fields"] if error.details else {})

    if not partial or "unitLabel" in payload:
        cleaned["unit_label"] = _parse_text(
            payload.get("unitLabel"),
            "unitLabel",
            label="um rótulo de unidade",
            maximum=30,
        )

    if not partial or "rating" in payload:
        try:
            cleaned["rating"] = _parse_optional_int(
                payload.get("rating"), "rating", minimum=1, maximum=5
            )
        except ValidationError as error:
            fields.update(error.details["fields"] if error.details else {})

    if not partial or "status" in payload:
        status = payload.get("status", "want" if current is None else current.status)
        if not isinstance(status, str) or status not in VALID_STATUSES:
            fields["status"] = "Escolha um estado válido."
        else:
            cleaned["status"] = status

    if not partial or "startedOn" in payload:
        try:
            cleaned["started_on"] = _parse_optional_date(
                payload.get("startedOn"), "startedOn"
            )
        except ValidationError as error:
            fields.update(error.details["fields"] if error.details else {})

    if not partial or "finishedOn" in payload:
        try:
            cleaned["finished_on"] = _parse_optional_date(
                payload.get("finishedOn"), "finishedOn"
            )
        except ValidationError as error:
            fields.update(error.details["fields"] if error.details else {})

    if not partial or "progressOverride" in payload:
        try:
            cleaned["progress_override"] = _parse_optional_decimal(
                payload.get("progressOverride"), "progressOverride"
            )
        except ValidationError as error:
            fields.update(error.details["fields"] if error.details else {})

    if not partial or "archived" in payload:
        archived = payload.get("archived", False if current is None else current.archived)
        if not isinstance(archived, bool):
            fields["archived"] = "Use verdadeiro ou falso."
        else:
            cleaned["archived"] = archived

    if not partial or "genres" in payload:
        try:
            genres = _parse_genres(payload.get("genres"))
        except ValidationError as error:
            fields.update(error.details["fields"] if error.details else {})

    if fields:
        raise ValidationError("Revise os campos informados.", {"fields": fields})

    resulting_type_id = cleaned.get(
        "media_type_id", current.media_type_id if current else None
    )
    if resulting_type_id is None:
        raise ValidationError(
            "Escolha um tipo de mídia.",
            {"fields": {"typeId": "Selecione um tipo."}},
        )
    media_type = _require_type(resulting_type_id)

    resulting_title = cleaned.get("title", current.title if current else None)
    if resulting_title is None:
        raise ValidationError(
            "Informe um título.",
            {"fields": {"title": "O título é obrigatório."}},
        )

    existing = repository.find_item_by_title(
        resulting_type_id,
        resulting_title,
        exclude_id=current.id if current else None,
    )
    if existing is not None:
        raise ConflictError(
            "Já existe um item com este título e tipo. Diferencie versões no título."
        )

    if current is not None and resulting_type_id != current.media_type_id:
        new_units = set(allowed_units_for(media_type))
        invalid = [event.unit for event in current.events if event.unit not in new_units]
        if invalid:
            raise ValidationError(
                "O novo tipo não aceita as unidades já registradas neste item.",
                {
                    "fields": {
                        "typeId": (
                            "Exclua ou ajuste os registros de consumo antes de "
                            "trocar o tipo."
                        )
                    }
                },
            )

    started_on = cleaned.get("started_on", current.started_on if current else None)
    finished_on = cleaned.get("finished_on", current.finished_on if current else None)
    if started_on and finished_on and started_on > finished_on:
        raise ValidationError(
            "A data de início deve ser anterior à conclusão.",
            {"fields": {"startedOn": "Início posterior à conclusão."}},
        )

    total_units = cleaned.get("total_units", current.total_units if current else None)
    progress_override = cleaned.get(
        "progress_override", current.progress_override if current else None
    )
    if (
        total_units is not None
        and progress_override is not None
        and Decimal(str(progress_override)) > Decimal(total_units)
    ):
        raise ValidationError(
            "O progresso não pode ultrapassar o total conhecido.",
            {"fields": {"progressOverride": "Use um valor até o total."}},
        )

    return cleaned, genres


def _apply_genres(item: MediaItem, names: Iterable[str]) -> None:
    genres: list[Genre] = []
    for name in names:
        genre = repository.get_genre_by_name(name)
        if genre is None:
            genre = Genre(name=name)
            repository.add_genre(genre)
        genres.append(genre)
    item.genres = genres


def create_item(payload: Any) -> MediaItem:
    cleaned, genres = _validate_item_payload(payload)
    item = MediaItem(**cleaned)
    _apply_genres(item, genres or [])
    repository.add_item(item)
    repository.commit()
    return item


def update_item(item_id: int, payload: Any) -> MediaItem:
    item = get_item(item_id)
    cleaned, genres = _validate_item_payload(payload, partial=True, current=item)
    for key, value in cleaned.items():
        setattr(item, key, value)
    if genres is not None:
        _apply_genres(item, genres)
    repository.commit()
    return item


def delete_item(item_id: int) -> None:
    item = get_item(item_id)
    repository.delete_item(item)
    repository.commit()


def create_media_type(payload: Any) -> MediaType:
    ensure_default_types()
    if not isinstance(payload, dict):
        raise ValidationError("Envie um objeto JSON válido.")

    fields: dict[str, str] = {}
    name = payload.get("name")
    default_unit = payload.get("defaultUnit", "unit")
    unit_label = payload.get("unitLabel")

    if not isinstance(name, str) or not name.strip():
        fields["name"] = "Informe um nome para o tipo."
    elif len(name.strip()) > 60:
        fields["name"] = "Use no máximo 60 caracteres."

    if not isinstance(default_unit, str) or default_unit not in CUSTOM_UNITS:
        fields["defaultUnit"] = "Escolha uma unidade padrão válida."

    if unit_label is not None:
        if not isinstance(unit_label, str) or not unit_label.strip():
            fields["unitLabel"] = "Informe um rótulo válido."
        elif len(unit_label.strip()) > 30:
            fields["unitLabel"] = "Use no máximo 30 caracteres."

    if fields:
        raise ValidationError("Revise os campos informados.", {"fields": fields})

    base_code = f"custom-{_slug(name.strip())}"
    code = base_code
    suffix = 2
    while repository.get_media_type_by_code(code) is not None:
        code = f"{base_code}-{suffix}"
        suffix += 1

    media_type = MediaType(
        code=code,
        name=name.strip(),
        default_unit=default_unit,
        unit_label=(unit_label or DEFAULT_UNIT_LABELS.get(default_unit, "unidades")).strip(),
        is_system=False,
    )
    repository.add_media_type(media_type)
    repository.commit()
    return media_type


def estimate_event_minutes(
    event: MediaConsumptionEvent, item: MediaItem
) -> Decimal | None:
    """Estima tempo apenas quando há duração conhecida e unidade compatível.

    Tempo real informado em ``duration_minutes`` nunca é estimado de novo.
    """

    if event.duration_minutes is not None:
        return None
    average = item.average_duration_minutes
    if average is not None and event.unit in {"episode", "lesson", "chapter", "unit"}:
        return (Decimal(str(event.amount)) * Decimal(average)).quantize(
            QUANTIZE, rounding=ROUND_HALF_UP
        )
    total = item.total_duration_minutes
    if total is not None and event.unit in {"movie", "documentary"}:
        return (Decimal(str(event.amount)) * Decimal(total)).quantize(
            QUANTIZE, rounding=ROUND_HALF_UP
        )
    return None


def event_time(
    event: MediaConsumptionEvent, item: MediaItem
) -> tuple[str, Decimal | None]:
    if event.duration_minutes is not None:
        return "real", Decimal(str(event.duration_minutes))
    # Horas e minutos informados diretamente já são tempo declarado pelo usuário.
    if event.unit == "minute":
        return "real", Decimal(str(event.amount))
    if event.unit == "hour":
        return "real", (Decimal(str(event.amount)) * Decimal("60")).quantize(
            QUANTIZE, rounding=ROUND_HALF_UP
        )
    estimated = estimate_event_minutes(event, item)
    if estimated is not None:
        return "estimated", estimated
    return "unknown", None


def compute_item_aggregates(item: MediaItem) -> dict[str, Any]:
    default_unit = item.media_type.default_unit
    consumed: dict[str, Decimal] = {}
    progress_consumed = Decimal("0")
    real_minutes = Decimal("0")
    estimated_minutes = Decimal("0")
    unknown_events = 0
    last_consumed: date | None = None

    for event in item.events:
        amount = Decimal(str(event.amount))
        consumed[event.unit] = consumed.get(event.unit, Decimal("0")) + amount
        if event.unit == default_unit and not event.is_repeat:
            progress_consumed += amount
        kind, minutes = event_time(event, item)
        if kind == "real" and minutes is not None:
            real_minutes += minutes
        elif kind == "estimated" and minutes is not None:
            estimated_minutes += minutes
        else:
            unknown_events += 1
        if last_consumed is None or event.consumed_on > last_consumed:
            last_consumed = event.consumed_on

    current_progress = (
        Decimal(str(item.progress_override))
        if item.progress_override is not None
        else progress_consumed
    )
    percent = None
    if item.total_units is not None and item.total_units > 0:
        percent = (current_progress / Decimal(item.total_units) * Decimal("100")).quantize(
            Decimal("0.01"), rounding=ROUND_HALF_UP
        )

    return {
        "consumed": [
            {
                "unit": unit,
                "label": unit_label(item, unit),
                "amount": round(float(amount), 3),
            }
            for unit, amount in sorted(consumed.items())
        ],
        "progress": {
            "unit": default_unit,
            "label": unit_label(item, default_unit),
            "consumed": round(float(progress_consumed), 3),
            "override": (
                round(float(item.progress_override), 3)
                if item.progress_override is not None
                else None
            ),
            "current": round(float(current_progress), 3),
            "total": item.total_units,
            "percent": float(percent) if percent is not None else None,
        },
        "time": {
            "realMinutes": round(float(real_minutes), 2),
            "estimatedMinutes": round(float(estimated_minutes), 2),
            "unknownEvents": unknown_events,
            "totalKnownMinutes": round(float(real_minutes + estimated_minutes), 2),
        },
        "eventCount": len(item.events),
        "repeatCount": sum(1 for event in item.events if event.is_repeat),
        "lastConsumedOn": last_consumed.isoformat() if last_consumed else None,
    }


def list_items(
    *,
    query: str | None = None,
    type_code: str | None = None,
    status: str | None = None,
    genre: str | None = None,
    sort: str = "recent",
    limit: int = 24,
    offset: int = 0,
    include_archived: bool = False,
) -> dict[str, Any]:
    ensure_default_types()
    type_id = None
    if type_code:
        media_type = repository.get_media_type_by_code(type_code)
        if media_type is None:
            raise ValidationError(
                "Tipo de mídia inválido.", {"fields": {"type": "Tipo desconhecido."}}
            )
        type_id = media_type.id
    if status and status not in VALID_STATUSES:
        raise ValidationError(
            "Estado inválido.", {"fields": {"status": "Estado desconhecido."}}
        )
    if sort not in VALID_SORTS:
        raise ValidationError(
            "Ordenação inválida.", {"fields": {"sort": "Ordenação desconhecida."}}
        )
    if query is not None and len(query) > 200:
        raise ValidationError(
            "Busca longa demais.", {"fields": {"query": "Use no máximo 200 caracteres."}}
        )

    rows, total = repository.list_items(
        query=query,
        type_id=type_id,
        status=status,
        genre=genre,
        include_archived=include_archived,
        sort=sort,
        limit=limit,
        offset=offset,
    )
    return {
        "items": [{"item": item, "aggregates": compute_item_aggregates(item)} for item in rows],
        "total": total,
        "limit": max(1, min(limit, 100)),
        "offset": max(offset, 0),
    }


def _validate_event_payload(
    item: MediaItem,
    payload: Any,
    *,
    current: MediaConsumptionEvent | None = None,
) -> dict[str, Any]:
    if not isinstance(payload, dict):
        raise ValidationError("Envie um objeto JSON válido.")

    fields: dict[str, str] = {}
    cleaned: dict[str, Any] = {}

    if not partial_event(payload, "date", current):
        raw_date = payload.get("date")
    else:
        raw_date = payload.get("date", current.consumed_on.isoformat() if current else None)

    try:
        if raw_date is None:
            raise ValidationError(
                "Informe a data do consumo.",
                {"fields": {"date": "Escolha uma data."}},
            )
        consumed_on = _parse_optional_date(raw_date, "date")
        if consumed_on is None:
            raise ValidationError(
                "Informe a data do consumo.",
                {"fields": {"date": "Escolha uma data."}},
            )
        if consumed_on > date.today():
            fields["date"] = "Escolha uma data até hoje."
        else:
            cleaned["consumed_on"] = consumed_on
    except ValidationError as error:
        fields.update(error.details["fields"] if error.details else {})

    raw_amount = payload.get("amount", current.amount if current else None)
    try:
        cleaned["amount"] = measurement_amount(raw_amount)
    except ValidationError as error:
        fields.update(error.details["fields"] if error.details else {})

    raw_unit = payload.get("unit", current.unit if current else item.media_type.default_unit)
    if not isinstance(raw_unit, str) or not raw_unit.strip():
        fields["unit"] = "Escolha uma unidade de consumo."
    elif raw_unit not in allowed_units(item):
        fields["unit"] = "Unidade incompatível com este tipo de mídia."
    else:
        cleaned["unit"] = raw_unit

    if not partial_event(payload, "durationMinutes", current):
        try:
            cleaned["duration_minutes"] = _parse_optional_decimal(
                payload.get("durationMinutes"), "durationMinutes", minimum=Decimal("0.01")
            )
        except ValidationError as error:
            fields.update(error.details["fields"] if error.details else {})

    if not partial_event(payload, "note", current):
        try:
            cleaned["note"] = _parse_text(
                payload.get("note"), "note", label="uma observação", maximum=500
            )
        except ValidationError as error:
            fields.update(error.details["fields"] if error.details else {})

    if not partial_event(payload, "isRepeat", current):
        is_repeat = payload.get("isRepeat", False)
        if not isinstance(is_repeat, bool):
            fields["isRepeat"] = "Use verdadeiro ou falso."
        else:
            cleaned["is_repeat"] = is_repeat

    if fields:
        raise ValidationError("Revise os campos informados.", {"fields": fields})
    return cleaned


def partial_event(
    payload: dict[str, Any], key: str, current: MediaConsumptionEvent | None
) -> bool:
    """Em criação todos os campos são opcionais exceto data/quantidade.

    Em edição, o mesmo helper indica se o campo deve ser revalidado.
    """

    return current is not None and key not in payload


def measurement_amount(value: Any) -> Decimal:
    if isinstance(value, bool) or value is None:
        raise ValidationError(
            "Informe uma quantidade válida.",
            {"fields": {"amount": "Use um número maior que zero."}},
        )
    try:
        amount = Decimal(str(value).replace(",", "."))
    except (InvalidOperation, ValueError) as error:
        raise ValidationError(
            "Quantidade inválida.",
            {"fields": {"amount": "Use um número válido, como 1,5."}},
        ) from error
    if not amount.is_finite() or amount <= 0:
        raise ValidationError(
            "Quantidade inválida.",
            {"fields": {"amount": "Use um número maior que zero."}},
        )
    if amount > Decimal("1000000000"):
        raise ValidationError(
            "Quantidade muito alta.", {"fields": {"amount": "Use um valor menor."}}
        )
    return amount.quantize(QUANTIZE, rounding=ROUND_HALF_UP)


def create_event(item_id: int, payload: Any) -> MediaConsumptionEvent:
    item = get_item(item_id)
    cleaned = _validate_event_payload(item, payload)
    event = MediaConsumptionEvent(media_item_id=item.id, **cleaned)
    repository.add_event(event)
    repository.commit()
    return event


def update_event(event_id: int, payload: Any) -> MediaConsumptionEvent:
    event = repository.get_event(event_id)
    if event is None:
        raise NotFoundError("Registro de consumo não encontrado.")
    item = event.media_item
    cleaned = _validate_event_payload(item, payload, current=event)
    for key, value in cleaned.items():
        setattr(event, key, value)
    repository.commit()
    return event


def delete_event(event_id: int) -> None:
    event = repository.get_event(event_id)
    if event is None:
        raise NotFoundError("Registro de consumo não encontrado.")
    repository.delete_event(event)
    repository.commit()


def list_events(
    *,
    start: Any = None,
    end: Any = None,
    type_code: str | None = None,
    genre: str | None = None,
    limit: int = 30,
    offset: int = 0,
) -> dict[str, Any]:
    start_date = _parse_optional_date(start, "start") if isinstance(start, str) else start
    end_date = _parse_optional_date(end, "end") if isinstance(end, str) else end
    if start_date and end_date and start_date > end_date:
        raise ValidationError(
            "O início do período deve ser anterior ao fim.",
            {"fields": {"start": "Data inicial posterior à final."}},
        )
    type_id = None
    if type_code:
        media_type = repository.get_media_type_by_code(type_code)
        if media_type is None:
            raise ValidationError(
                "Tipo de mídia inválido.", {"fields": {"type": "Tipo desconhecido."}}
            )
        type_id = media_type.id
    rows, total = repository.list_events_page(
        start=start_date,
        end=end_date,
        type_id=type_id,
        genre=genre,
        limit=limit,
        offset=offset,
    )
    return {"events": rows, "total": total}


def _period_filter(start: Any, end: Any) -> tuple[date, date]:
    today = date.today()
    if end is None:
        end_date = today
    else:
        end_date = _parse_optional_date(end, "end") or today
    if start is None:
        start_date = (end_date.replace(day=1) - timedelta(days=330)).replace(day=1)
    else:
        start_date = _parse_optional_date(start, "start") or end_date
    if start_date > end_date:
        raise ValidationError(
            "O início do período deve ser anterior ao fim.",
            {"fields": {"start": "Data inicial posterior à final."}},
        )
    if (end_date - start_date).days > MAX_STATS_DAYS:
        raise ValidationError(
            f"O período máximo para estatísticas é de {MAX_STATS_DAYS} dias.",
            {"fields": {"start": "Reduza o intervalo consultado."}},
        )
    return start_date, end_date


def _month_iter(start: date, end: date):
    cursor = start.replace(day=1)
    while cursor <= end:
        yield cursor
        cursor = (cursor.replace(day=28) + timedelta(days=4)).replace(day=1)


def get_stats(
    *,
    start: Any = None,
    end: Any = None,
    type_code: str | None = None,
    genre: str | None = None,
) -> dict[str, Any]:
    ensure_default_types()
    start_date, end_date = _period_filter(start, end)
    type_id = None
    if type_code:
        media_type = repository.get_media_type_by_code(type_code)
        if media_type is None:
            raise ValidationError(
                "Tipo de mídia inválido.", {"fields": {"type": "Tipo desconhecido."}}
            )
        type_id = media_type.id

    items = repository.list_all_items(
        type_id=type_id, genre=genre, include_archived=True
    )
    item_by_id = {item.id: item for item in items}
    events = repository.list_events(
        start=start_date, end=end_date, type_id=type_id, genre=genre
    )

    status_counts = {status: 0 for status in VALID_STATUSES}
    type_counts: dict[int, dict[str, Any]] = {}
    genre_counts: dict[str, int] = {}
    archived_count = 0
    for item in items:
        status_counts[item.status] = status_counts.get(item.status, 0) + 1
        if item.archived:
            archived_count += 1
        type_entry = type_counts.setdefault(
            item.media_type_id,
            {
                "type": item.media_type,
                "count": 0,
                "completed": 0,
            },
        )
        type_entry["count"] += 1
        if item.status == "completed":
            type_entry["completed"] += 1
        for genre_obj in item.genres:
            genre_counts[genre_obj.name] = genre_counts.get(genre_obj.name, 0) + 1

    quantity_totals: dict[str, Decimal] = {}
    month_buckets: dict[str, dict[str, Any]] = {
        month.strftime("%Y-%m"): {
            "month": month.strftime("%Y-%m"),
            "eventCount": 0,
            "quantities": {},
            "realMinutes": Decimal("0"),
            "estimatedMinutes": Decimal("0"),
            "unknownEvents": 0,
        }
        for month in _month_iter(start_date, end_date)
    }
    real_minutes = Decimal("0")
    estimated_minutes = Decimal("0")
    unknown_events = 0
    unit_label_by_unit: dict[str, str] = {}

    for event in events:
        item = item_by_id.get(event.media_item_id) or event.media_item
        amount = Decimal(str(event.amount))
        quantity_totals[event.unit] = quantity_totals.get(event.unit, Decimal("0")) + amount
        unit_label_by_unit.setdefault(event.unit, unit_label(item, event.unit))
        kind, minutes = event_time(event, item)
        month_key = event.consumed_on.strftime("%Y-%m")
        bucket = month_buckets.get(month_key)
        if bucket is None:
            bucket = {
                "month": month_key,
                "eventCount": 0,
                "quantities": {},
                "realMinutes": Decimal("0"),
                "estimatedMinutes": Decimal("0"),
                "unknownEvents": 0,
            }
            month_buckets[month_key] = bucket
        bucket["eventCount"] += 1
        bucket["quantities"][event.unit] = (
            bucket["quantities"].get(event.unit, Decimal("0")) + amount
        )
        if kind == "real" and minutes is not None:
            real_minutes += minutes
            bucket["realMinutes"] += minutes
        elif kind == "estimated" and minutes is not None:
            estimated_minutes += minutes
            bucket["estimatedMinutes"] += minutes
        else:
            unknown_events += 1
            bucket["unknownEvents"] += 1

    months = []
    for key in sorted(month_buckets):
        bucket = month_buckets[key]
        months.append(
            {
                "month": bucket["month"],
                "eventCount": bucket["eventCount"],
                "quantities": [
                    {
                        "unit": unit,
                        "label": unit_label_by_unit.get(unit, unit),
                        "amount": round(float(amount), 3),
                    }
                    for unit, amount in sorted(bucket["quantities"].items())
                ],
                "realMinutes": round(float(bucket["realMinutes"]), 2),
                "estimatedMinutes": round(float(bucket["estimatedMinutes"]), 2),
                "unknownEvents": bucket["unknownEvents"],
            }
        )

    return {
        "filters": {
            "start": start_date.isoformat(),
            "end": end_date.isoformat(),
            "type": type_code,
            "genre": genre,
        },
        "totals": {
            "items": len(items),
            "completed": status_counts.get("completed", 0),
            "inProgress": status_counts.get("in_progress", 0),
            "paused": status_counts.get("paused", 0),
            "dropped": status_counts.get("dropped", 0),
            "want": status_counts.get("want", 0),
            "archived": archived_count,
            "events": len(events),
        },
        "quantities": [
            {
                "unit": unit,
                "label": unit_label_by_unit.get(unit, unit),
                "amount": round(float(amount), 3),
            }
            for unit, amount in sorted(quantity_totals.items())
        ],
        "time": {
            "realMinutes": round(float(real_minutes), 2),
            "estimatedMinutes": round(float(estimated_minutes), 2),
            "unknownEvents": unknown_events,
            "totalKnownMinutes": round(float(real_minutes + estimated_minutes), 2),
        },
        "byType": sorted(
            [
                {
                    "type": entry["type"].name,
                    "code": entry["type"].code,
                    "count": entry["count"],
                    "completed": entry["completed"],
                }
                for entry in type_counts.values()
            ],
            key=lambda entry: entry["count"],
            reverse=True,
        ),
        "byGenre": sorted(
            [
                {"name": name, "count": count}
                for name, count in genre_counts.items()
            ],
            key=lambda entry: entry["count"],
            reverse=True,
        ),
        "months": months,
        "recentEvents": [],
        "recentEventsSource": events[-10:][::-1],
    }
