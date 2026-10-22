from __future__ import annotations

import argparse
import ctypes
import html
import json
import logging
import os
import socket
import sys
import threading
import time
import urllib.error
import urllib.parse
import urllib.request
import webbrowser
from pathlib import Path
from typing import Any, Sequence

ROOT_DIR = Path(__file__).resolve().parent
BACKEND_DIR = ROOT_DIR / "backend"
FRONTEND_INDEX = ROOT_DIR / "frontend" / "dist" / "index.html"
LAUNCHER_TEMPLATE = ROOT_DIR / "desktop" / "launcher.html"
LAUNCHER_ICON = ROOT_DIR / "assets" / "brand" / "elisa.ico"
LOG_FILE = ROOT_DIR / "data" / "elisa-desktop.log"

DEFAULT_HOST = "127.0.0.1"
DEFAULT_PORT = 5000
STARTUP_TIMEOUT_SECONDS = 10.0
WINDOWS_APP_ID = "Elisa.Desktop"

if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

log = logging.getLogger("elisa.desktop")


class LocalServer:
    def __init__(self, app: Any, host: str = DEFAULT_HOST, port: int = DEFAULT_PORT) -> None:
        from waitress.server import create_server

        self._httpd = create_server(app, host=host, port=port, threads=4)
        self.host = host
        self.port = int(self._httpd.socket.getsockname()[1])
        self.url = f"http://{host}:{self.port}"
        self._thread = threading.Thread(target=self._serve, name="elisa-http", daemon=True)
        self._stopped = threading.Event()

    def _serve(self) -> None:
        try:
            self._httpd.run()
        except Exception:
            log.exception("O servidor local encerrou inesperadamente.")

    def start(self) -> None:
        if self._thread.is_alive():
            return

        self._thread.start()
        self._wait_until_ready()

    def _wait_until_ready(self) -> None:
        deadline = time.monotonic() + STARTUP_TIMEOUT_SECONDS

        while time.monotonic() < deadline:
            if not self._thread.is_alive():
                raise RuntimeError("O servidor local encerrou antes de ficar disponível.")

            try:
                with urllib.request.urlopen(f"{self.url}/api/health", timeout=1) as response:
                    if response.status < 500:
                        return
            except urllib.error.HTTPError:
                return
            except (urllib.error.URLError, TimeoutError, OSError):
                time.sleep(0.05)

        raise RuntimeError(
            f"O servidor local não respondeu em {STARTUP_TIMEOUT_SECONDS:.0f} segundos."
        )

    def stop(self) -> None:
        if self._stopped.is_set():
            return

        self._stopped.set()
        logging.getLogger("waitress").setLevel(logging.CRITICAL)
        self._httpd.close()
        if self._thread.is_alive():
            self._thread.join(timeout=5)

    @property
    def is_running(self) -> bool:
        return self._thread.is_alive() and not self._stopped.is_set()


def database_is_ready(app: Any) -> bool:
    from sqlalchemy import inspect

    from app.core.extensions import db

    with app.app_context():
        inspector = inspect(db.engine)
        return inspector.has_table("activities") and inspector.has_table("diary_entries")


def can_bind(url: str) -> bool:
    parsed = urllib.parse.urlsplit(url)
    host = parsed.hostname or DEFAULT_HOST
    port = parsed.port or DEFAULT_PORT

    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as sock:
        try:
            sock.bind((host, port))
        except OSError:
            return False
    return True


def probe_service(url: str) -> str:
    """Retorna 'absent', 'elisa' ou 'busy' para o endereço informado."""
    try:
        with urllib.request.urlopen(f"{url}/api/health", timeout=1) as response:
            body = response.read()
            status_code = response.status
    except urllib.error.HTTPError as exc:
        body = exc.read()
        status_code = exc.code
    except urllib.error.URLError as exc:
        if isinstance(exc.reason, ConnectionRefusedError):
            return "absent"
        return "absent" if can_bind(url) else "busy"
    except (TimeoutError, OSError):
        return "absent" if can_bind(url) else "busy"

    if status_code >= 500:
        try:
            payload = json.loads(body.decode("utf-8"))
        except (ValueError, UnicodeDecodeError):
            payload = None
        if isinstance(payload, dict) and "version" in payload and "database" in payload:
            return "elisa"
        return "busy"

    try:
        payload = json.loads(body.decode("utf-8"))
    except (ValueError, UnicodeDecodeError):
        return "busy"

    if isinstance(payload, dict) and "version" in payload and "database" in payload:
        return "elisa"
    return "busy"


class LauncherApi:
    def __init__(self, port: int) -> None:
        self._requested_port = port
        self._url = f"http://{DEFAULT_HOST}:{port}"
        self._server: LocalServer | None = None
        self._window: Any | None = None
        self._lock = threading.Lock()
        self._state = "idle"
        self._detail = "Aguardando inicialização."
        self._started = False
        self._closing = False

    def attach(self, window: Any) -> None:
        self._window = window

    def _set_state(self, state: str, detail: str) -> None:
        with self._lock:
            self._state = state
            self._detail = detail

    def _mark_server_lost(self, server: LocalServer) -> None:
        with self._lock:
            if self._server is not server or self._state != "running":
                return
            self._server = None
            self._state = "error"
            self._detail = (
                "O servidor local parou inesperadamente. "
                "Consulte data/elisa-desktop.log e tente novamente."
            )

        try:
            server.stop()
        except Exception:
            log.exception("Falha ao limpar o servidor local que parou.")

    def status(self) -> dict[str, Any]:
        with self._lock:
            state = self._state
            detail = self._detail
            server = self._server
            url = self._url

        if state == "running" and server is not None and not server.is_running:
            self._mark_server_lost(server)
            with self._lock:
                state = self._state
                detail = self._detail
                server = self._server
                url = self._url

        return {
            "state": state,
            "detail": detail,
            "url": url,
            "canOpen": state in {"running", "external"},
            "canStop": state == "running" and server is not None,
            "owned": server is not None,
        }

    def start(self) -> dict[str, bool]:
        with self._lock:
            if self._started or self._closing:
                return {"ok": True}
            self._started = True

        threading.Thread(target=self._start_worker, name="elisa-start", daemon=True).start()
        return {"ok": True}

    def retry(self) -> dict[str, bool]:
        with self._lock:
            if self._state != "error" or self._closing:
                return {"ok": False}
            self._started = False

        return self.start()

    def _start_worker(self) -> None:
        self._set_state("starting", "Verificando o ambiente e os serviços...")

        try:
            existing = probe_service(self._url)

            if existing == "elisa":
                self._set_state(
                    "external",
                    "Já existe uma Elisa em execução neste endereço. "
                    "O launcher não vai encerrá-la.",
                )
                return

            if existing == "busy":
                raise RuntimeError(
                    f"A porta {self._requested_port} está ocupada por outro serviço.\n\n"
                    "Encerre o serviço ou inicie o launcher com --port <porta>."
                )

            if not FRONTEND_INDEX.is_file():
                raise RuntimeError(
                    "O build do frontend não foi encontrado.\n\n"
                    "Execute:\n"
                    "  cd frontend\n"
                    "  npm run build\n\n"
                    "Ou use iniciar_elisa.cmd, que gera o build quando ele estiver ausente."
                )

            from dotenv import load_dotenv

            load_dotenv(ROOT_DIR / ".env")

            from app import create_app

            app = create_app({"SERVE_FRONTEND": True})

            if not database_is_ready(app):
                raise RuntimeError(
                    "O banco de dados ainda não foi inicializado.\n\n"
                    "Execute a partir de backend/:\n"
                    "  ..\\.venv\\Scripts\\flask.exe --app run db upgrade"
                )

            with self._lock:
                if self._closing:
                    return

            server = LocalServer(app, host=DEFAULT_HOST, port=self._requested_port)
            server.start()

            with self._lock:
                if self._closing:
                    stop_after_close = True
                else:
                    stop_after_close = False
                    self._server = server
                    self._url = server.url
                    self._requested_port = server.port

            if stop_after_close:
                server.stop()
                return

            self._set_state("running", "Servidor local ativo. A Elisa pode ser aberta no navegador.")
            log.info("Elisa Desktop iniciada em %s", server.url)
        except Exception as exc:
            log.exception("Falha ao iniciar os serviços da Elisa.")
            self._set_state("error", str(exc))

    def open_app(self) -> dict[str, Any]:
        with self._lock:
            state = self._state
            url = self._url

        if state not in {"running", "external"}:
            return {"ok": False, "error": "A Elisa ainda não está disponível."}

        webbrowser.open(url)
        return {"ok": True}

    def shutdown(self) -> dict[str, bool]:
        with self._lock:
            if self._closing:
                return {"ok": True}
            self._closing = True
            server = self._server
            self._server = None
            self._state = "stopping"
            self._detail = "Encerrando o servidor local..."

        threading.Thread(
            target=self._shutdown_worker,
            args=(server,),
            name="elisa-shutdown",
            daemon=True,
        ).start()
        return {"ok": True}

    def _shutdown_worker(self, server: LocalServer | None) -> None:
        try:
            if server is not None:
                server.stop()
            self._set_state("stopped", "Servidor encerrado.")
        except Exception:
            log.exception("Falha ao encerrar o servidor local.")
        finally:
            try:
                if self._window is not None:
                    self._window.destroy()
            except Exception:
                log.exception("Falha ao fechar a janela do launcher.")

    def on_window_closed(self) -> None:
        with self._lock:
            self._closing = True
            server = self._server
            self._server = None

        if server is not None:
            try:
                server.stop()
            except Exception:
                log.exception("Falha ao encerrar o servidor após fechar a janela.")


def render_launcher_html(url: str) -> str:
    template = LAUNCHER_TEMPLATE.read_text(encoding="utf-8")
    return template.replace("__ELISA_URL__", html.escape(url, quote=True))


def resolve_launcher_icon() -> str | None:
    """Caminho do ícone do launcher, quando o arquivo existe.

    O pywebview usa esse arquivo no ícone da janela (`webview.start(icon=...)`).
    """
    if LAUNCHER_ICON.is_file():
        return str(LAUNCHER_ICON)
    return None


def apply_windows_app_id() -> None:
    """Dá ao processo identidade própria na barra de tarefas do Windows.

    Sem o AppUserModelID, o Windows agrupa a janela sob o ícone do Python e
    ignora o ícone definido em `webview.start(icon=...)`.
    """
    if sys.platform != "win32":
        return

    try:
        ctypes.windll.shell32.SetCurrentProcessExplicitAppUserModelID(WINDOWS_APP_ID)
    except (AttributeError, OSError):
        log.exception("Falha ao definir a identidade do aplicativo no Windows.")


def run_desktop(port: int = DEFAULT_PORT, debug: bool = False) -> None:
    try:
        import webview
    except ImportError as exc:
        raise RuntimeError(
            "O pywebview não está instalado.\n\n"
            "Execute:\n"
            "  .\\.venv\\Scripts\\python.exe -m pip install "
            "-r backend\\requirements-desktop.txt"
        ) from exc

    apply_windows_app_id()

    api = LauncherApi(port)
    window = webview.create_window(
        "Elisa",
        html=render_launcher_html(api.status()["url"]),
        js_api=api,
        width=560,
        height=460,
        min_size=(480, 400),
        background_color="#0B0B0D",
        text_select=True,
    )

    def on_loaded() -> None:
        api.start()

    api.attach(window)
    window.events.loaded += on_loaded
    window.events.closed += api.on_window_closed

    start_options: dict[str, Any] = {}
    icon = resolve_launcher_icon()
    if icon:
        start_options["icon"] = icon

    log.info("Abrindo launcher desktop para %s", api.status()["url"])
    webview.start(debug=debug, **start_options)


def show_error_dialog(message: str) -> None:
    if sys.platform == "win32":
        try:
            ctypes.windll.user32.MessageBoxW(None, message, "Elisa — erro ao iniciar", 0x10)
            return
        except Exception:
            log.exception("Falha ao exibir a caixa de erro.")

    if sys.stderr is not None:
        print(message, file=sys.stderr)


def configure_logging() -> None:
    LOG_FILE.parent.mkdir(parents=True, exist_ok=True)
    handlers: list[logging.Handler] = [
        logging.FileHandler(LOG_FILE, encoding="utf-8"),
    ]
    if sys.stderr is not None:
        handlers.append(logging.StreamHandler())

    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s %(levelname)s %(name)s: %(message)s",
        handlers=handlers,
        force=True,
    )


def main(argv: Sequence[str] | None = None) -> int:
    configure_logging()

    from dotenv import load_dotenv

    load_dotenv(ROOT_DIR / ".env")

    parser = argparse.ArgumentParser(description="Abre o launcher desktop da Elisa.")
    parser.add_argument(
        "--port",
        type=int,
        default=None,
        help=f"Porta local (padrão: FLASK_PORT ou {DEFAULT_PORT}).",
    )
    parser.add_argument(
        "--debug",
        action="store_true",
        help="Abre as ferramentas de desenvolvimento do webview.",
    )
    args = parser.parse_args(argv)

    if args.port is not None:
        port = args.port
    else:
        try:
            port = int(os.getenv("FLASK_PORT", str(DEFAULT_PORT)))
        except ValueError:
            show_error_dialog("FLASK_PORT precisa ser um número inteiro.")
            return 1

    if not 1 <= port <= 65535:
        show_error_dialog("A porta precisa estar entre 1 e 65535.")
        return 1

    try:
        run_desktop(port=port, debug=args.debug)
    except Exception as exc:
        log.exception("Falha ao abrir o launcher desktop.")
        show_error_dialog(
            "Não foi possível abrir o launcher da Elisa.\n\n"
            f"{exc}\n\n"
            f"Detalhes técnicos: {LOG_FILE}"
        )
        return 1

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
