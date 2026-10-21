from __future__ import annotations

import argparse
import sqlite3
from datetime import datetime
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Cria um backup consistente do banco SQLite da Elisa."
    )
    parser.add_argument(
        "--source",
        type=Path,
        default=ROOT / "data" / "elisa.db",
        help="Caminho do banco de origem (padrão: data/elisa.db).",
    )
    parser.add_argument(
        "--destination",
        type=Path,
        default=ROOT / "data" / "backups",
        help="Diretório de destino (padrão: data/backups).",
    )
    args = parser.parse_args()

    source: Path = args.source.resolve()
    destination: Path = args.destination.resolve()

    if not source.is_file():
        raise SystemExit(f"Banco não encontrado: {source}")

    destination.mkdir(parents=True, exist_ok=True)
    stamp = datetime.now().strftime("%Y%m%d-%H%M%S")
    target = destination / f"elisa-{stamp}.db"

    with sqlite3.connect(source) as source_connection:
        with sqlite3.connect(target) as target_connection:
            source_connection.backup(target_connection)

    print(f"Backup criado: {target}")


if __name__ == "__main__":
    main()
