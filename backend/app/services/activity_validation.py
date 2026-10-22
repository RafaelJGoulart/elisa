from __future__ import annotations

from datetime import date, datetime
from decimal import Decimal
from typing import Any

from app.core.errors import NotFoundError, ValidationError
from app.models import Activity, ActivityProgressEntry
from app.repositories import activity_repository as repository
from app.services import measurement_service

VALID_COLORS = {"purple", "magenta", "red", "green", "blue", "yellow", "orange"}
VALID_KINDS = {"binary", "measurable"}
VALID_FREQUENCIES = {"daily", "weekly", "monthly"}
DATE_FORMAT = "%Y-%m-%d"


def parse_date(value: Any, field: str = "date") -> date:
    if not isinstance(value, str):
        raise ValidationError(
            "Informe uma data válida.", {"fields": {field: "Use o formato AAAA-MM-DD."}}
        )
    try:
        return datetime.strptime(value, DATE_FORMAT).date()
    except ValueError as error:
        raise ValidationError(
            "Data inválida.", {"fields": {field: "Use o formato AAAA-MM-DD."}}
        ) from error


def _parse_unit_id(value: Any, field: str = "unitId") -> int:
    if isinstance(value, bool) or not isinstance(value, int) or value <= 0:
        raise ValidationError(
            "Escolha uma unidade válida.",
            {"fields": {field: "Informe o identificador de uma unidade existente."}},
        )
    return value


def _parse_optional_target(value: Any) -> Decimal | None:
    if value is None:
        return None
    return measurement_service.parse_amount(value, field="targetAmount")


def validate_payload(
    payload: Any, *, partial: bool = False, current: Activity | None = None
) -> dict[str, Any]:
    if not isinstance(payload, dict):
        raise ValidationError("Envie um objeto JSON válido.")

    fields: dict[str, str] = {}
    cleaned: dict[str, Any] = {}

    if not partial or "name" in payload:
        name = payload.get("name")
        if not isinstance(name, str) or not name.strip():
            fields["name"] = "Informe um nome para a atividade."
        elif len(name.strip()) < 2:
            fields["name"] = "Use pelo menos 2 caracteres."
        elif len(name.strip()) > 80:
            fields["name"] = "Use no máximo 80 caracteres."
        else:
            cleaned["name"] = name.strip()

    if not partial or "description" in payload:
        description = payload.get("description")
        if description is None:
            cleaned["description"] = None
        elif not isinstance(description, str):
            fields["description"] = "A descrição deve ser um texto."
        elif len(description.strip()) > 500:
            fields["description"] = "Use no máximo 500 caracteres."
        else:
            cleaned["description"] = description.strip() or None

    if not partial or "category" in payload:
        category = payload.get("category")
        if not isinstance(category, str) or not category.strip():
            fields["category"] = "Informe uma categoria."
        elif len(category.strip()) > 40:
            fields["category"] = "Use no máximo 40 caracteres."
        else:
            cleaned["category"] = category.strip()

    if not partial or "color" in payload:
        color = payload.get("color")
        if not isinstance(color, str) or color not in VALID_COLORS:
            fields["color"] = "Escolha uma cor válida."
        else:
            cleaned["color"] = color

    if not partial or "kind" in payload:
        kind = payload.get("kind", "binary" if current is None else current.kind)
        if not isinstance(kind, str) or kind not in VALID_KINDS:
            fields["kind"] = "Escolha um tipo de hábito válido."
        else:
            cleaned["kind"] = kind

    if not partial or "frequency" in payload:
        frequency = payload.get(
            "frequency", "daily" if current is None else current.frequency
        )
        if not isinstance(frequency, str) or frequency not in VALID_FREQUENCIES:
            fields["frequency"] = "Escolha uma frequência válida."
        else:
            cleaned["frequency"] = frequency

    if not partial or "unitId" in payload:
        unit_value = payload.get("unitId")
        if unit_value is None:
            cleaned["unit_id"] = None
        else:
            cleaned["unit_id"] = _parse_unit_id(unit_value)

    if not partial or "targetAmount" in payload:
        try:
            cleaned["target_amount"] = _parse_optional_target(
                payload.get("targetAmount")
            )
        except ValidationError as error:
            if error.details and "fields" in error.details:
                fields.update(error.details["fields"])
            else:
                fields["targetAmount"] = error.message

    if not partial or "archived" in payload:
        archived = payload.get("archived", False if current is None else current.archived)
        if not isinstance(archived, bool):
            fields["archived"] = "Use verdadeiro ou falso."
        else:
            cleaned["archived"] = archived

    if fields:
        raise ValidationError("Revise os campos informados.", {"fields": fields})

    resulting_kind = cleaned.get("kind", current.kind if current else "binary")
    resulting_frequency = cleaned.get(
        "frequency", current.frequency if current else "daily"
    )
    resulting_unit_id = cleaned.get(
        "unit_id", current.unit_id if current else None
    )
    resulting_target = cleaned.get(
        "target_amount", current.target_amount if current else None
    )

    if resulting_kind == "measurable":
        if resulting_unit_id is None:
            fields["unitId"] = "Escolha a unidade de medida do hábito."
        if resulting_frequency not in VALID_FREQUENCIES:
            fields["frequency"] = "Escolha uma frequência válida."
    else:
        # Hábito binário mantém o comportamento histórico: conclusão por dia.
        if "unit_id" in cleaned and resulting_unit_id is not None:
            fields["unitId"] = "Hábitos binários não usam unidade de medida."
        if "target_amount" in cleaned and resulting_target is not None:
            fields["targetAmount"] = "Hábitos binários não usam meta quantitativa."
        if "frequency" in cleaned and resulting_frequency != "daily":
            fields["frequency"] = "Hábitos binários usam frequência diária."
        if current is None:
            cleaned["unit_id"] = None
            cleaned["target_amount"] = None
            cleaned["frequency"] = "daily"
        elif cleaned.get("kind") == "binary":
            cleaned["unit_id"] = None
            cleaned["target_amount"] = None
            cleaned["frequency"] = "daily"

    if fields:
        raise ValidationError("Revise os campos informados.", {"fields": fields})

    if resulting_kind == "measurable" and resulting_unit_id is not None:
        measurement_service.ensure_default_units()
        unit = repository.get_unit(resulting_unit_id)
        if unit is None:
            fields["unitId"] = "Selecione uma unidade existente."
        elif (
            current is not None
            and current.unit is not None
            and current.unit_id != resulting_unit_id
            and repository.list_progress_entries(current.id)
        ):
            if current.unit.dimension != unit.dimension:
                fields["unitId"] = (
                    "Não é possível trocar para uma unidade incompatível enquanto "
                    "houver registros. Exclua os registros antes de mudar a grandeza."
                )
        if fields:
            raise ValidationError("Revise os campos informados.", {"fields": fields})

    return cleaned


def require_measurable(activity: Activity) -> None:
    if activity.kind != "measurable":
        raise ValidationError(
            "Esta atividade é binária. Use o registro de conclusão diária.",
            {"fields": {"kind": "Hábitos binários não recebem quantidades."}},
        )


def validate_progress_payload(
    activity: Activity,
    payload: Any,
    *,
    current: ActivityProgressEntry | None = None,
) -> dict[str, Any]:
    require_measurable(activity)
    if not isinstance(payload, dict):
        raise ValidationError("Envie um objeto JSON válido.")
    if activity.unit is None:
        raise ValidationError("O hábito não possui unidade de medida.")

    fields: dict[str, str] = {}
    cleaned: dict[str, Any] = {}

    raw_date = payload.get("date", current.entry_date.isoformat() if current else None)
    try:
        entry_date = parse_date(raw_date)
    except ValidationError as error:
        fields.update(error.details["fields"] if error.details else {})
        entry_date = None
    if entry_date is not None:
        if entry_date > date.today():
            fields["date"] = "Escolha uma data até hoje."
        else:
            cleaned["entry_date"] = entry_date

    raw_amount = payload.get("amount", current.amount if current else None)
    try:
        amount = measurement_service.parse_amount(raw_amount)
        cleaned["amount"] = amount
    except ValidationError as error:
        fields.update(error.details["fields"] if error.details else {})

    raw_unit = payload.get("unitId")
    if raw_unit is None:
        unit = current.unit if current is not None else activity.unit
    else:
        try:
            unit = measurement_service.get_unit(_parse_unit_id(raw_unit))
        except (ValidationError, NotFoundError) as error:
            fields["unitId"] = error.message
            unit = None

    if unit is not None:
        try:
            measurement_service.convert_amount(Decimal("1"), unit, activity.unit)
        except ValidationError:
            fields["unitId"] = (
                f"A unidade {unit.symbol} não é compatível com {activity.unit.symbol}."
            )
        else:
            cleaned["unit_id"] = unit.id

    if "note" in payload:
        note = payload.get("note")
        if note is None:
            cleaned["note"] = None
        elif not isinstance(note, str):
            fields["note"] = "A observação deve ser um texto."
        elif len(note.strip()) > 500:
            fields["note"] = "Use no máximo 500 caracteres."
        else:
            cleaned["note"] = note.strip() or None

    if fields:
        raise ValidationError("Revise os campos informados.", {"fields": fields})
    return cleaned
