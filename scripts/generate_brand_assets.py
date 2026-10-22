"""Gera os arquivos de marca da Elisa (SVG, PNG e ICO) a partir de uma geometria única.

Fonte da verdade: ``frontend/src/brand/mark.json`` — a mesma que a interface React
consome em ``frontend/src/components/shared/ElisaMark.tsx``. O traço do triângulo é o
ícone ``triangle`` do Feather Icons; o núcleo central é a identidade própria do hub.

Saídas:

- ``assets/brand/elisa-mark.svg``       marca isolada;
- ``assets/brand/elisa-icon.svg``       ícone do aplicativo (fundo transparente);
- ``assets/brand/elisa-icon-*.png``     PNG em vários tamanhos;
- ``assets/brand/elisa.ico``            ícone do Windows em múltiplas resoluções;
- ``frontend/public/favicon.svg``       favicon usado pela interface;
- ``frontend/public/favicon-32x32.png`` favicon em PNG (navegadores antigos);
- ``frontend/public/apple-touch-icon.png`` ícone de toque do iOS/macOS;
- ``desktop/launcher.html``             marca injetada no launcher (bloco delimitado).

Uso:

    python -m pip install pillow
    python scripts/generate_brand_assets.py           # gera os arquivos
    python scripts/generate_brand_assets.py --check   # confere se estão atualizados
"""

from __future__ import annotations

import argparse
import json
import math
import re
import sys
from pathlib import Path
from typing import Any, Sequence

ROOT_DIR = Path(__file__).resolve().parent.parent
MARK_JSON_PATH = ROOT_DIR / "frontend" / "src" / "brand" / "mark.json"
BRAND_DIR = ROOT_DIR / "assets" / "brand"
PUBLIC_DIR = ROOT_DIR / "frontend" / "public"
LAUNCHER_HTML_PATH = ROOT_DIR / "desktop" / "launcher.html"

MARK_START = "<!-- ELISA_MARK:START -->"
MARK_END = "<!-- ELISA_MARK:END -->"

PNG_SIZES = (16, 32, 48, 64, 128, 256, 512)
ICO_SIZES = (16, 24, 32, 48, 64, 128, 256)
FAVICON_PNG_SIZE = 32
APPLE_TOUCH_SIZE = 180
SUPERSAMPLE = 4

NUMBER_PATTERN = re.compile(r"[-+]?(?:\d*\.\d+|\d+\.?)(?:[eE][-+]?\d+)?")
COMMANDS = "MmLlHhVvAaZz"

Point = tuple[float, float]


# --------------------------------------------------------------------------- #
# Geometria
# --------------------------------------------------------------------------- #


def _tokenize(path: str) -> list[str | float]:
    tokens: list[str | float] = []
    index = 0

    while index < len(path):
        char = path[index]

        if char in COMMANDS:
            tokens.append(char)
            index += 1
            continue

        if char in " ,\t\r\n":
            index += 1
            continue

        match = NUMBER_PATTERN.match(path, index)
        if match is None:
            raise ValueError(f"Token inesperado na curva: {char!r}")

        tokens.append(float(match.group()))
        index = match.end()

    return tokens


def _angle(ux: float, uy: float, vx: float, vy: float) -> float:
    norm = math.hypot(ux, uy) * math.hypot(vx, vy)
    if norm == 0:
        return 0.0

    cosine = max(-1.0, min(1.0, (ux * vx + uy * vy) / norm))
    angle = math.acos(cosine)

    if ux * vy - uy * vx < 0:
        angle = -angle

    return angle


def _arc_points(
    start: Point,
    end: Point,
    rx: float,
    ry: float,
    rotation: float,
    large_arc: float,
    sweep: float,
) -> list[Point]:
    """Converte um arco SVG (parametrização por extremos) em pontos, conforme F.6.5."""
    x1, y1 = start
    x2, y2 = end

    if rx == 0 or ry == 0:
        return [start, end]

    rx, ry = abs(rx), abs(ry)
    phi = math.radians(rotation)
    cos_phi, sin_phi = math.cos(phi), math.sin(phi)

    dx = (x1 - x2) / 2
    dy = (y1 - y2) / 2
    x1p = cos_phi * dx + sin_phi * dy
    y1p = -sin_phi * dx + cos_phi * dy

    lam = (x1p * x1p) / (rx * rx) + (y1p * y1p) / (ry * ry)
    if lam > 1:
        scale = math.sqrt(lam)
        rx *= scale
        ry *= scale

    denominator = rx * rx * y1p * y1p + ry * ry * x1p * x1p
    numerator = rx * rx * ry * ry - rx * rx * y1p * y1p - ry * ry * x1p * x1p
    factor = math.sqrt(max(0.0, numerator / denominator)) if denominator else 0.0
    if large_arc == sweep:
        factor = -factor

    cxp = factor * rx * y1p / ry
    cyp = -factor * ry * x1p / rx
    cx = cos_phi * cxp - sin_phi * cyp + (x1 + x2) / 2
    cy = sin_phi * cxp + cos_phi * cyp + (y1 + y2) / 2

    ux = (x1p - cxp) / rx
    uy = (y1p - cyp) / ry
    vx = (-x1p - cxp) / rx
    vy = (-y1p - cyp) / ry

    theta = _angle(1.0, 0.0, ux, uy)
    delta = _angle(ux, uy, vx, vy)

    if not sweep and delta > 0:
        delta -= 2 * math.pi
    elif sweep and delta < 0:
        delta += 2 * math.pi

    steps = max(2, math.ceil(abs(delta) / (math.pi / 16)))
    points: list[Point] = []

    for step in range(steps + 1):
        angle = theta + delta * step / steps
        px = cos_phi * rx * math.cos(angle) - sin_phi * ry * math.sin(angle) + cx
        py = sin_phi * rx * math.cos(angle) + cos_phi * ry * math.sin(angle) + cy
        points.append((px, py))

    return points


def flatten_path(path: str) -> list[list[Point]]:
    """Converte um `d` de SVG em polilinhas (suporta M, L, H, V, A e Z)."""
    tokens = _tokenize(path)
    subpaths: list[list[Point]] = []
    current: list[Point] = []
    point: Point = (0.0, 0.0)
    start: Point = (0.0, 0.0)
    command: str | None = None
    index = 0

    while index < len(tokens):
        token = tokens[index]

        if isinstance(token, str):
            command = token
            index += 1

            if command in "Zz":
                if current:
                    subpaths.append(current)
                current = []
                point = start

            continue

        if command is None:
            raise ValueError("A curva começa com um comando.")

        relative = command.islower()
        upper = command.upper()

        if upper == "M":
            x, y = tokens[index], tokens[index + 1]
            index += 2
            if relative:
                x += point[0]
                y += point[1]
            if current:
                subpaths.append(current)
            current = [(x, y)]
            point = (x, y)
            start = point
            command = "l" if relative else "L"
        elif upper == "L":
            x, y = tokens[index], tokens[index + 1]
            index += 2
            if relative:
                x += point[0]
                y += point[1]
            current.append((x, y))
            point = (x, y)
        elif upper == "H":
            x = tokens[index]
            index += 1
            if relative:
                x += point[0]
            current.append((x, point[1]))
            point = (x, point[1])
        elif upper == "V":
            y = tokens[index]
            index += 1
            if relative:
                y += point[1]
            current.append((point[0], y))
            point = (point[0], y)
        elif upper == "A":
            rx, ry, rotation, large_arc, sweep, x, y = tokens[index : index + 7]
            index += 7
            if relative:
                x += point[0]
                y += point[1]
            arc = _arc_points(point, (x, y), rx, ry, rotation, large_arc, sweep)
            current.extend(arc[1:])
            point = (x, y)
        else:
            raise ValueError(f"Comando de curva não suportado: {command}")

    if current:
        subpaths.append(current)

    return subpaths


def path_bounds(path: str) -> tuple[float, float, float, float]:
    """Caixa delimitadora da curva (x_min, y_min, x_max, y_max)."""
    points = [point for subpath in flatten_path(path) for point in subpath]
    xs = [point[0] for point in points]
    ys = [point[1] for point in points]
    return min(xs), min(ys), max(xs), max(ys)


# --------------------------------------------------------------------------- #
# SVG
# --------------------------------------------------------------------------- #


def _mark_path(mark: dict[str, Any], stroke: str) -> str:
    return (
        f'  <path d="{mark["triangle"]}" stroke="{stroke}" '
        f'stroke-width="{mark["strokeWidth"]}" />'
    )


def build_mark_svg(mark: dict[str, Any], size: int = 24) -> str:
    colors = mark["colors"]
    return (
        '<svg xmlns="http://www.w3.org/2000/svg" '
        f'viewBox="{mark["viewBox"]}" width="{size}" height="{size}" '
        'fill="none" stroke-linecap="round" stroke-linejoin="round" '
        'role="img" aria-label="Elisa">\n'
        f'{_mark_path(mark, colors["primary"])}\n'
        "</svg>\n"
    )


def build_icon_svg(mark: dict[str, Any], size: int = 32) -> str:
    colors = mark["colors"]
    icon = mark["icon"]
    padding = icon["padding"]

    return (
        '<svg xmlns="http://www.w3.org/2000/svg" '
        f'viewBox="0 0 {icon["size"]} {icon["size"]}" width="{size}" height="{size}" '
        'role="img" aria-label="Elisa">\n'
        f'  <g transform="translate({padding} {padding})" fill="none" '
        'stroke-linecap="round" stroke-linejoin="round">\n'
        f'    <path d="{mark["triangle"]}" stroke="{colors["primary"]}" '
        f'stroke-width="{mark["strokeWidth"]}" />\n'
        "  </g>\n"
        "</svg>\n"
    )


def build_inline_mark(mark: dict[str, Any], size: int = 24) -> str:
    """Marca em uma linha, para injeção no HTML do launcher."""
    colors = mark["colors"]
    return (
        '<svg xmlns="http://www.w3.org/2000/svg" '
        f'viewBox="{mark["viewBox"]}" width="{size}" height="{size}" fill="none" '
        'stroke-linecap="round" stroke-linejoin="round" focusable="false" '
        'aria-hidden="true">'
        f'<path d="{mark["triangle"]}" stroke="{colors["primary"]}" '
        f'stroke-width="{mark["strokeWidth"]}" />'
        "</svg>"
    )


# --------------------------------------------------------------------------- #
# PNG
# --------------------------------------------------------------------------- #


def render_icon(mark: dict[str, Any], size: int):
    """Desenha o ícone do aplicativo em PNG (RGBA, fundo transparente)."""
    from PIL import Image, ImageDraw

    icon = mark["icon"]
    colors = mark["colors"]

    canvas_size = size * SUPERSAMPLE
    pixels_per_unit = canvas_size / icon["size"]

    def to_canvas(point: Point) -> Point:
        return (point[0] * pixels_per_unit, point[1] * pixels_per_unit)

    image = Image.new("RGBA", (canvas_size, canvas_size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(image)

    padding = icon["padding"]
    stroke_width = mark["strokeWidth"] * pixels_per_unit
    stroke_color = colors["primary"]

    for subpath in flatten_path(mark["triangle"]):
        points = [
            to_canvas((point[0] + padding, point[1] + padding)) for point in subpath
        ]
        if len(points) > 1:
            draw.line(points, fill=stroke_color, width=int(round(stroke_width)))
        half = stroke_width / 2
        for x, y in points:
            draw.ellipse([x - half, y - half, x + half, y + half], fill=stroke_color)

    return image.resize((size, size), Image.LANCZOS)


# --------------------------------------------------------------------------- #
# Escrita dos arquivos
# --------------------------------------------------------------------------- #


def _write_text(path: Path, content: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(content, encoding="utf-8", newline="\n")


def _write_bytes(path: Path, content: bytes) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_bytes(content)


def _inject_launcher_mark(mark: dict[str, Any], template: str) -> str:
    if MARK_START not in template or MARK_END not in template:
        raise ValueError(
            f"{LAUNCHER_HTML_PATH} precisa conter os marcadores {MARK_START} e {MARK_END}."
        )

    inline = build_inline_mark(mark)
    start = template.index(MARK_START) + len(MARK_START)
    end = template.index(MARK_END)
    return f"{template[:start]}\n        {inline}\n      {template[end:]}"


def build_outputs(mark: dict[str, Any]) -> dict[Path, bytes]:
    """Monta todos os arquivos gerados (sem gravar em disco)."""
    from io import BytesIO

    outputs: dict[Path, bytes] = {}

    outputs[BRAND_DIR / "elisa-mark.svg"] = build_mark_svg(mark).encode("utf-8")
    outputs[BRAND_DIR / "elisa-icon.svg"] = build_icon_svg(mark).encode("utf-8")
    outputs[PUBLIC_DIR / "favicon.svg"] = build_icon_svg(mark).encode("utf-8")

    def png_bytes(size: int) -> bytes:
        stream = BytesIO()
        render_icon(mark, size).save(stream, format="PNG", optimize=True)
        return stream.getvalue()

    for size in PNG_SIZES:
        outputs[BRAND_DIR / f"elisa-icon-{size}.png"] = png_bytes(size)

    outputs[PUBLIC_DIR / "favicon-32x32.png"] = png_bytes(FAVICON_PNG_SIZE)
    outputs[PUBLIC_DIR / "apple-touch-icon.png"] = png_bytes(APPLE_TOUCH_SIZE)

    ico_stream = BytesIO()
    render_icon(mark, max(ICO_SIZES)).save(
        ico_stream, format="ICO", sizes=[(size, size) for size in ICO_SIZES]
    )
    outputs[BRAND_DIR / "elisa.ico"] = ico_stream.getvalue()

    template = LAUNCHER_HTML_PATH.read_text(encoding="utf-8")
    outputs[LAUNCHER_HTML_PATH] = _inject_launcher_mark(mark, template).encode("utf-8")

    return outputs


def write_outputs(outputs: dict[Path, bytes]) -> list[Path]:
    written: list[Path] = []

    for path, content in outputs.items():
        if path.suffix in {".png", ".ico"}:
            _write_bytes(path, content)
        else:
            _write_text(path, content.decode("utf-8"))
        written.append(path)

    return written


def check_outputs(outputs: dict[Path, bytes]) -> list[Path]:
    outdated: list[Path] = []

    for path, content in outputs.items():
        if not path.exists():
            outdated.append(path)
            continue
        if path.read_bytes() != content:
            outdated.append(path)

    return outdated


def load_mark() -> dict[str, Any]:
    return json.loads(MARK_JSON_PATH.read_text(encoding="utf-8"))


def main(argv: Sequence[str] | None = None) -> int:
    parser = argparse.ArgumentParser(
        description="Gera os arquivos de marca da Elisa a partir de mark.json."
    )
    parser.add_argument(
        "--check",
        action="store_true",
        help="Apenas verifica se os arquivos gerados estão atualizados.",
    )
    args = parser.parse_args(argv)

    try:
        import PIL  # noqa: F401
    except ImportError:
        print(
            "Pillow é necessário para gerar os PNG e o ICO.\n"
            "Instale com: python -m pip install pillow",
            file=sys.stderr,
        )
        return 1

    mark = load_mark()
    outputs = build_outputs(mark)

    if args.check:
        outdated = check_outputs(outputs)
        if outdated:
            print("Arquivos de marca desatualizados:")
            for path in outdated:
                print(f"  - {path.relative_to(ROOT_DIR)}")
            print("\nRode: python scripts/generate_brand_assets.py")
            return 1
        print("Arquivos de marca atualizados.")
        return 0

    for path in write_outputs(outputs):
        print(f"gerado: {path.relative_to(ROOT_DIR)}")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
