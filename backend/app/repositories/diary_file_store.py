from __future__ import annotations

import os
import re
import tempfile
import unicodedata
from dataclasses import dataclass
from datetime import datetime
from pathlib import Path
from typing import Any

import yaml

ENTRY_ID_PATTERN = re.compile(r"^[0-9a-f]{32}$")
FRONTMATTER_OPEN = re.compile(r"\A---\r?\n")
FRONTMATTER_CLOSE = re.compile(r"\r?\n---[ \t]*(?:\r?\n|\Z)")
SLUG_SEPARATOR = re.compile(r"[^a-z0-9]+")
VALID_TITLE_LIMIT = 160
VALID_TAGS_LIMIT = 10


class DiaryFileError(Exception):
    """Erro seguro de leitura ou escrita de um arquivo do Diário."""


@dataclass(frozen=True)
class DiaryDocument:
    id: str
    title: str
    content: str
    tags: list[str]
    created_at: datetime
    updated_at: datetime


def is_valid_entry_id(value: str) -> bool:
    return bool(ENTRY_ID_PATTERN.fullmatch(value))


def slugify(title: str) -> str:
    normalized = unicodedata.normalize("NFKD", title)
    ascii_text = normalized.encode("ascii", "ignore").decode("ascii").lower()
    slug = SLUG_SEPARATOR.sub("-", ascii_text).strip("-")
    return slug[:48] or "registro"


def _parse_timestamp(value: Any, field: str) -> datetime:
    if isinstance(value, datetime):
        parsed = value
    elif isinstance(value, str):
        try:
            parsed = datetime.fromisoformat(value.replace("Z", "+00:00"))
        except ValueError as error:
            raise DiaryFileError(f"Data inválida em {field}.") from error
    else:
        raise DiaryFileError(f"Data ausente em {field}.")

    if parsed.tzinfo is None:
        parsed = parsed.replace(tzinfo=datetime.now().astimezone().tzinfo)
    return parsed


def _parse_tags(value: Any) -> list[str]:
    if value is None:
        return []
    if not isinstance(value, list):
        raise DiaryFileError("Etiquetas inválidas no frontmatter.")

    tags: list[str] = []
    seen: set[str] = set()
    for raw in value:
        if not isinstance(raw, str):
            raise DiaryFileError("Etiquetas inválidas no frontmatter.")
        tag = raw.strip()
        if not tag:
            continue
        if len(tag) > 30:
            raise DiaryFileError("Etiqueta longa demais no frontmatter.")
        key = tag.casefold()
        if key in seen:
            continue
        seen.add(key)
        tags.append(tag)

    if len(tags) > VALID_TAGS_LIMIT:
        raise DiaryFileError("Há etiquetas demais no frontmatter.")
    return tags


class DiaryFileStore:
    def __init__(self, root: Path | str) -> None:
        self.root = Path(root).resolve()
        self.root.mkdir(parents=True, exist_ok=True)

    def resolve(self, relative_path: str) -> Path:
        if not isinstance(relative_path, str) or not relative_path.strip():
            raise DiaryFileError("Caminho de registro inválido.")
        relative = Path(relative_path)
        if relative.is_absolute():
            raise DiaryFileError("Caminho de registro inválido.")

        candidate = (self.root / relative).resolve()
        try:
            candidate.relative_to(self.root)
        except ValueError as error:
            raise DiaryFileError("Caminho de registro inválido.") from error

        if candidate == self.root or candidate.suffix.lower() != ".md":
            raise DiaryFileError("Caminho de registro inválido.")
        return candidate

    def relative_path_for(
        self, entry_id: str, created_at: datetime, title: str
    ) -> str:
        if not is_valid_entry_id(entry_id):
            raise DiaryFileError("Identificador de registro inválido.")
        filename = f"{entry_id}-{slugify(title)}.md"
        return f"{created_at:%Y}/{created_at:%m}/{filename}"

    def read(self, relative_path: str) -> DiaryDocument:
        path = self.resolve(relative_path)
        try:
            text = path.read_text(encoding="utf-8")
        except FileNotFoundError as error:
            raise DiaryFileError("Arquivo do registro não encontrado.") from error
        except OSError as error:
            raise DiaryFileError("Não foi possível ler o arquivo do registro.") from error
        return self._parse(text)

    def write(self, document: DiaryDocument, relative_path: str) -> None:
        path = self.resolve(relative_path)
        text = self._serialize(document)
        path.parent.mkdir(parents=True, exist_ok=True)

        temp_name: str | None = None
        try:
            descriptor, temp_name = tempfile.mkstemp(
                prefix=f".{path.name}.", suffix=".tmp", dir=path.parent
            )
            with os.fdopen(descriptor, "w", encoding="utf-8", newline="\n") as handle:
                handle.write(text)
                handle.flush()
                os.fsync(handle.fileno())
            os.replace(temp_name, path)
            temp_name = None
        except OSError as error:
            raise DiaryFileError("Não foi possível gravar o arquivo do registro.") from error
        finally:
            if temp_name is not None:
                try:
                    Path(temp_name).unlink(missing_ok=True)
                except OSError:
                    pass

    def delete(self, relative_path: str) -> None:
        path = self.resolve(relative_path)
        try:
            path.unlink(missing_ok=True)
        except OSError as error:
            raise DiaryFileError("Não foi possível excluir o arquivo do registro.") from error

    def has_files(self) -> bool:
        return any(self.root.rglob("*.md"))

    def scan(self) -> tuple[list[tuple[str, DiaryDocument]], list[dict[str, str]], set[str]]:
        documents: list[tuple[str, DiaryDocument]] = []
        errors: list[dict[str, str]] = []
        existing_paths: set[str] = set()

        for path in sorted(self.root.rglob("*.md")):
            try:
                relative = path.relative_to(self.root).as_posix()
            except ValueError:
                continue
            existing_paths.add(relative)
            try:
                documents.append((relative, self.read(relative)))
            except DiaryFileError as error:
                errors.append({"file": relative, "message": str(error)})

        return documents, errors, existing_paths

    def _parse(self, text: str) -> DiaryDocument:
        opening = FRONTMATTER_OPEN.match(text)
        if opening is None:
            raise DiaryFileError("Frontmatter ausente.")
        rest = text[opening.end() :]
        closing = FRONTMATTER_CLOSE.search(rest)
        if closing is None:
            raise DiaryFileError("Frontmatter não finalizado.")

        header = rest[: closing.start()]
        body = rest[closing.end() :]
        if body.startswith("\n"):
            body = body[1:]

        try:
            metadata = yaml.safe_load(header)
        except yaml.YAMLError as error:
            raise DiaryFileError("Frontmatter YAML inválido.") from error
        if not isinstance(metadata, dict):
            raise DiaryFileError("Frontmatter inválido.")

        entry_id = metadata.get("id")
        if not isinstance(entry_id, str) or not is_valid_entry_id(entry_id):
            raise DiaryFileError("Identificador inválido no frontmatter.")

        title = metadata.get("title", "")
        if title is None:
            title = ""
        if not isinstance(title, str):
            raise DiaryFileError("Título inválido no frontmatter.")
        title = title.strip()
        if len(title) > VALID_TITLE_LIMIT:
            raise DiaryFileError("Título longo demais no frontmatter.")

        if not body.strip():
            raise DiaryFileError("O registro está sem conteúdo.")

        created_at = _parse_timestamp(metadata.get("created_at"), "created_at")
        updated_at = _parse_timestamp(metadata.get("updated_at"), "updated_at")
        if updated_at < created_at:
            raise DiaryFileError("Datas inconsistentes no frontmatter.")

        return DiaryDocument(
            id=entry_id,
            title=title,
            content=body,
            tags=_parse_tags(metadata.get("tags")),
            created_at=created_at,
            updated_at=updated_at,
        )

    def _serialize(self, document: DiaryDocument) -> str:
        metadata = {
            "id": document.id,
            "title": document.title,
            "created_at": document.created_at.isoformat(),
            "updated_at": document.updated_at.isoformat(),
            "tags": document.tags,
        }
        header = yaml.safe_dump(
            metadata,
            allow_unicode=True,
            sort_keys=False,
            default_flow_style=False,
        ).rstrip()
        return f"---\n{header}\n---\n\n{document.content}"
