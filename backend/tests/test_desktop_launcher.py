from __future__ import annotations

import types
import urllib.request

import elisa_desktop
from elisa_desktop import LauncherApi, LocalServer, probe_service, render_launcher_html


def test_local_server_starts_and_stops(app):
    server = LocalServer(app, port=0)
    server.start()

    try:
        with urllib.request.urlopen(f"{server.url}/api/health", timeout=2) as response:
            assert response.status == 200
        assert server.is_running
        assert probe_service(server.url) == "elisa"
    finally:
        server.stop()

    assert not server.is_running
    assert probe_service(server.url) == "absent"
    server.stop()


def test_render_launcher_html_replaces_address():
    html = render_launcher_html("http://127.0.0.1:5123")

    assert "__ELISA_URL__" not in html
    assert "http://127.0.0.1:5123" in html
    assert "<iframe" not in html


def test_apply_windows_app_id_define_identidade_propria(monkeypatch):
    calls: list[str] = []

    class FakeShell:
        @staticmethod
        def SetCurrentProcessExplicitAppUserModelID(app_id: str) -> None:
            calls.append(app_id)

    fake_windll = types.SimpleNamespace(shell32=FakeShell)
    monkeypatch.setattr(elisa_desktop.sys, "platform", "win32")
    monkeypatch.setattr(elisa_desktop.ctypes, "windll", fake_windll, raising=False)

    elisa_desktop.apply_windows_app_id()

    assert calls == [elisa_desktop.WINDOWS_APP_ID]


def test_apply_windows_app_id_nao_faz_nada_fora_do_windows(monkeypatch):
    def fail(*_args, **_kwargs):
        raise AssertionError("não deveria tocar no shell do Windows")

    monkeypatch.setattr(elisa_desktop.sys, "platform", "linux")
    monkeypatch.setattr(elisa_desktop.ctypes, "windll", types.SimpleNamespace(shell32=fail), raising=False)

    elisa_desktop.apply_windows_app_id()


def test_status_reports_owned_server_that_stopped_unexpectedly():
    class StoppedServer:
        is_running = False

        def __init__(self) -> None:
            self.was_stopped = False

        def stop(self) -> None:
            self.was_stopped = True

    api = LauncherApi(port=5000)
    server = StoppedServer()
    api._server = server
    api._state = "running"

    status = api.status()

    assert status["state"] == "error"
    assert status["canOpen"] is False
    assert status["canStop"] is False
    assert server.was_stopped
