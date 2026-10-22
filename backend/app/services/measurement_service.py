from __future__ import annotations

import re
import unicodedata
from decimal import Decimal, InvalidOperation, ROUND_HALF_UP
from typing import Any

from app.core.errors import NotFoundError, ValidationError
from app.models import MeasurementUnit
from app.repositories import activity_repository as repository

QUANTIZE = Decimal("0.0001")

DEFAULT_UNITS: tuple[dict[str, Any], ...] = (
    {
        "code": "ml",
        "name": "Mililitro",
        "symbol": "ml",
        "category": "Volume",
        "dimension": "volume",
        "factor": Decimal("1"),
    },
    {
        "code": "l",
        "name": "Litro",
        "symbol": "L",
        "category": "Volume",
        "dimension": "volume",
        "factor": Decimal("1000"),
    },
    {
        "code": "m",
        "name": "Metro",
        "symbol": "m",
        "category": "Distância",
        "dimension": "distance",
        "factor": Decimal("1"),
    },
    {
        "code": "km",
        "name": "Quilômetro",
        "symbol": "km",
        "category": "Distância",
        "dimension": "distance",
        "factor": Decimal("1000"),
    },
    {
        "code": "s",
        "name": "Segundo",
        "symbol": "s",
        "category": "Tempo",
        "dimension": "time",
        "factor": Decimal("1"),
    },
    {
        "code": "min",
        "name": "Minuto",
        "symbol": "min",
        "category": "Tempo",
        "dimension": "time",
        "factor": Decimal("60"),
    },
    {
        "code": "h",
        "name": "Hora",
        "symbol": "h",
        "category": "Tempo",
        "dimension": "time",
        "factor": Decimal("3600"),
    },
    {
        "code": "pages",
        "name": "Página",
        "symbol": "pág.",
        "category": "Leitura",
        "dimension": "pages",
        "factor": Decimal("1"),
    },
    {
        "code": "unit",
        "name": "Unidade",
        "symbol": "un.",
        "category": "Contagem",
        "dimension": "count_unit",
        "factor": Decimal("1"),
    },
    {
        "code": "repetition",
        "name": "Repetição",
        "symbol": "rep.",
        "category": "Contagem",
        "dimension": "count_repetition",
        "factor": Decimal("1"),
    },
    {
        "code": "exercise",
        "name": "Exercício",
        "symbol": "exerc.",
        "category": "Contagem",
        "dimension": "count_exercise",
        "factor": Decimal("1"),
    },
    {
        "code": "word",
        "name": "Palavra",
        "symbol": "palavras",
        "category": "Contagem",
        "dimension": "count_word",
        "factor": Decimal("1"),
    },
    {
        "code": "chapter",
        "name": "Capítulo",
        "symbol": "cap.",
        "category": "Contagem",
        "dimension": "count_chapter",
        "factor": Decimal("1"),
    },
    {
        "code": "brl",
        "name": "Real",
        "symbol": "R$",
        "category": "Dinheiro",
        "dimension": "money_brl",
        "factor": Decimal("1"),
    },
    {
        "code": "g",
        "name": "Grama",
        "symbol": "g",
        "category": "Massa",
        "dimension": "mass",
        "factor": Decimal("1"),
    },
    {
        "code": "kg",
        "name": "Quilograma",
        "symbol": "kg",
        "category": "Massa",
        "dimension": "mass",
        "factor": Decimal("1000"),
    },
    {
        "code": "kcal",
        "name": "Quilocaloria",
        "symbol": "kcal",
        "category": "Energia",
        "dimension": "energy",
        "factor": Decimal("1"),
    },
)

SYSTEM_UNIT_CODES = {unit["code"] for unit in DEFAULT_UNITS}


def ensure_default_units() -> None:
    """Garante as unidades padrão também em bancos criados por testes.

    Em produção a migração já semeia as mesmas linhas; a operação é idempotente
    e usa o código estável como chave.
    """

    existing = {unit.code for unit in repository.list_units()}
    changed = False
    for unit in DEFAULT_UNITS:
        if unit["code"] in existing:
            continue
        repository.add_unit(MeasurementUnit(is_system=True, **unit))
        changed = True
    if changed:
        repository.commit()


def list_units() -> list[MeasurementUnit]:
    ensure_default_units()
    return repository.list_units()


def get_unit(unit_id: int) -> MeasurementUnit:
    unit = repository.get_unit(unit_id)
    if unit is None:
        raise NotFoundError("Unidade de medida não encontrada.")
    return unit


def get_unit_by_code(code: str) -> MeasurementUnit | None:
    return repository.get_unit_by_code(code)


def parse_amount(
    value: Any,
    *,
    field: str = "amount",
    minimum: Decimal = Decimal("0.0001"),
    maximum: Decimal = Decimal("1000000000"),
) -> Decimal:
    if isinstance(value, bool) or value is None:
        raise ValidationError(
            "Informe uma quantidade válida.",
            {"fields": {field: "Use um número maior que zero."}},
        )
    try:
        amount = Decimal(str(value).replace(",", "."))
    except (InvalidOperation, ValueError) as error:
        raise ValidationError(
            "Quantidade inválida.",
            {"fields": {field: "Use um número válido, como 1,5."}},
        ) from error

    if not amount.is_finite() or amount < minimum:
        raise ValidationError(
            "Quantidade inválida.",
            {"fields": {field: "Use um número maior que zero."}},
        )
    if amount > maximum:
        raise ValidationError(
            "Quantidade muito alta.",
            {"fields": {field: "Use um valor menor."}},
        )
    return amount.quantize(QUANTIZE, rounding=ROUND_HALF_UP)


def serialized_factor(unit: MeasurementUnit) -> Decimal:
    return Decimal(str(unit.factor))


def convert_amount(
    amount: Decimal, from_unit: MeasurementUnit, to_unit: MeasurementUnit
) -> Decimal:
    """Converte apenas unidades da mesma dimensão.

    A unidade base de cada dimensão tem fator 1. Converter litros para
    mililitros multiplica por 1000; páginas para quilômetros é rejeitado.
    """

    if from_unit.id == to_unit.id:
        return amount.quantize(QUANTIZE, rounding=ROUND_HALF_UP)
    if from_unit.dimension != to_unit.dimension:
        raise ValidationError(
            "Esta unidade não é compatível com a unidade do hábito.",
            {
                "fields": {
                    "unitId": (
                        f"Não é possível converter {from_unit.symbol} em "
                        f"{to_unit.symbol}."
                    )
                }
            },
        )
    converted = amount * serialized_factor(from_unit) / serialized_factor(to_unit)
    return converted.quantize(QUANTIZE, rounding=ROUND_HALF_UP)


def _slug(value: str) -> str:
    normalized = unicodedata.normalize("NFKD", value)
    ascii_value = normalized.encode("ascii", "ignore").decode("ascii").lower()
    return re.sub(r"[^a-z0-9]+", "-", ascii_value).strip("-") or "unidade"


def create_custom_unit(payload: Any) -> MeasurementUnit:
    ensure_default_units()
    if not isinstance(payload, dict):
        raise ValidationError("Envie um objeto JSON válido.")

    fields: dict[str, str] = {}
    name = payload.get("name")
    symbol = payload.get("symbol")

    if not isinstance(name, str) or not name.strip():
        fields["name"] = "Informe um nome para a unidade."
    elif len(name.strip()) > 40:
        fields["name"] = "Use no máximo 40 caracteres."

    if not isinstance(symbol, str) or not symbol.strip():
        fields["symbol"] = "Informe um símbolo curto."
    elif len(symbol.strip()) > 12:
        fields["symbol"] = "Use no máximo 12 caracteres."

    if fields:
        raise ValidationError("Revise os campos informados.", {"fields": fields})

    base_code = f"custom-{_slug(name.strip())}"
    code = base_code
    suffix = 2
    while repository.get_unit_by_code(code) is not None:
        code = f"{base_code}-{suffix}"
        suffix += 1

    unit = MeasurementUnit(
        code=code,
        name=name.strip(),
        symbol=symbol.strip(),
        category="Personalizada",
        dimension=f"custom:{code}",
        factor=Decimal("1"),
        is_system=False,
    )
    repository.add_unit(unit)
    repository.commit()
    return unit
