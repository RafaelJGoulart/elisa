from __future__ import annotations

import json
import struct
from pathlib import Path

import pytest

from elisa_desktop import LAUNCHER_ICON, resolve_launcher_icon

ROOT_DIR = Path(__file__).resolve().parent.parent.parent
MARK_JSON = ROOT_DIR / "frontend" / "src" / "brand" / "mark.json"
BRAND_DIR = ROOT_DIR / "assets" / "brand"
PUBLIC_DIR = ROOT_DIR / "frontend" / "public"
LAUNCHER_HTML = ROOT_DIR / "desktop" / "launcher.html"

FEATHER_TRIANGLE = (
    "M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"
)

EXPECTED_PNG_SIZES = {
    BRAND_DIR / "elisa-icon-16.png": 16,
    BRAND_DIR / "elisa-icon-32.png": 32,
    BRAND_DIR / "elisa-icon-48.png": 48,
    BRAND_DIR / "elisa-icon-64.png": 64,
    BRAND_DIR / "elisa-icon-128.png": 128,
    BRAND_DIR / "elisa-icon-256.png": 256,
    BRAND_DIR / "elisa-icon-512.png": 512,
    PUBLIC_DIR / "favicon-32x32.png": 32,
    PUBLIC_DIR / "apple-touch-icon.png": 180,
}

EXPECTED_ICO_SIZES = {16, 24, 32, 48, 64, 128, 256}


@pytest.fixture(scope="module")
def mark() -> dict:
    return json.loads(MARK_JSON.read_text(encoding="utf-8"))


def read_png_size(path: Path) -> tuple[int, int]:
    data = path.read_bytes()
    assert data[:8] == b"\x89PNG\r\n\x1a\n", f"{path.name} não é um PNG válido"
    assert data[12:16] == b"IHDR", f"{path.name} não tem cabeçalho IHDR"
    width, height = struct.unpack(">II", data[16:24])
    return width, height


def read_ico_sizes(path: Path) -> set[int]:
    data = path.read_bytes()
    assert data[:4] == b"\x00\x00\x01\x00", f"{path.name} não é um ICO válido"
    count = struct.unpack("<H", data[4:6])[0]
    sizes: set[int] = set()
    for index in range(count):
        entry = data[6 + index * 16 : 22 + index * 16]
        width, height = entry[0], entry[1]
        sizes.add(width or 256)
        assert (height or 256) == (width or 256)
    return sizes


def test_mark_json_descreve_o_triangulo_do_feather(mark: dict) -> None:
    assert mark["viewBox"] == "0 0 24 24"
    assert mark["triangle"] == FEATHER_TRIANGLE
    assert mark["strokeWidth"] > 0
    assert mark["icon"] == {"size": 32, "padding": 4}
    assert mark["colors"]["primary"] == "#8B5CF6"
    assert "background" not in mark["colors"]


def test_marca_nao_tem_elementos_alem_do_triangulo(mark: dict) -> None:
    assert set(mark) == {"name", "version", "viewBox", "strokeWidth", "triangle", "icon", "colors"}


def test_svg_gerados_contem_o_triangulo(mark: dict) -> None:
    for path in (BRAND_DIR / "elisa-mark.svg", BRAND_DIR / "elisa-icon.svg", PUBLIC_DIR / "favicon.svg"):
        content = path.read_text(encoding="utf-8")
        assert FEATHER_TRIANGLE in content, f"{path.name} não usa a geometria da marca"
        assert mark["colors"]["primary"] in content
        assert "<circle" not in content, f"{path.name} deve conter apenas o triângulo"
        assert "<rect" not in content, f"{path.name} deve ter fundo transparente"


def test_png_gerados_tem_as_dimensoes_esperadas() -> None:
    for path, size in EXPECTED_PNG_SIZES.items():
        assert path.is_file(), f"{path.name} não foi gerado"
        assert read_png_size(path) == (size, size)


def test_png_gerados_tem_fundo_transparente() -> None:
    pytest.importorskip("PIL", reason="Pillow é necessário para inspecionar os PNG.")

    from PIL import Image

    for path in (PUBLIC_DIR / "favicon-32x32.png", BRAND_DIR / "elisa-icon-256.png"):
        with Image.open(path) as image:
            assert image.mode == "RGBA", f"{path.name} precisa ter canal alfa"
            width, height = image.size
            corners = [
                image.getpixel((0, 0)),
                image.getpixel((width - 1, 0)),
                image.getpixel((0, height - 1)),
                image.getpixel((width - 1, height - 1)),
            ]
        assert all(pixel[3] == 0 for pixel in corners), (
            f"{path.name} deveria ter fundo transparente"
        )


def test_ico_contem_as_resolucoes_esperadas() -> None:
    assert LAUNCHER_ICON.is_file()
    assert read_ico_sizes(LAUNCHER_ICON) == EXPECTED_ICO_SIZES


def test_launcher_usa_a_marca_injetada(mark: dict) -> None:
    content = LAUNCHER_HTML.read_text(encoding="utf-8")
    assert content.count("<!-- ELISA_MARK:START -->") == 1
    assert content.count("<!-- ELISA_MARK:END -->") == 1
    assert FEATHER_TRIANGLE in content
    assert mark["colors"]["primary"] in content


def test_resolve_launcher_icon_aponta_para_arquivo_existente() -> None:
    icon = resolve_launcher_icon()
    assert icon is not None
    assert Path(icon).is_file()
    assert Path(icon) == LAUNCHER_ICON


def test_arquivos_de_texto_estao_atualizados(mark: dict) -> None:
    """O gerador precisa reproduzir exatamente o que está versionado."""
    import sys

    sys.path.insert(0, str(ROOT_DIR / "scripts"))
    from generate_brand_assets import build_icon_svg, build_inline_mark, build_mark_svg

    assert (BRAND_DIR / "elisa-mark.svg").read_text(encoding="utf-8") == build_mark_svg(mark)
    assert (BRAND_DIR / "elisa-icon.svg").read_text(encoding="utf-8") == build_icon_svg(mark)
    assert (PUBLIC_DIR / "favicon.svg").read_text(encoding="utf-8") == build_icon_svg(mark)

    launcher = LAUNCHER_HTML.read_text(encoding="utf-8")
    assert build_inline_mark(mark) in launcher


def test_arquivos_rasterizados_estao_atualizados(mark: dict) -> None:
    """Re-renderiza os PNG e o ICO para conferir que não estão defasados."""
    pytest.importorskip("PIL", reason="Pillow é necessário para re-renderizar os PNG.")

    import sys

    sys.path.insert(0, str(ROOT_DIR / "scripts"))
    from generate_brand_assets import build_outputs, check_outputs

    outdated = check_outputs(build_outputs(mark))
    assert not outdated, "Arquivos de marca desatualizados: " ", ".join(
        str(path.relative_to(ROOT_DIR)) for path in outdated
    )
