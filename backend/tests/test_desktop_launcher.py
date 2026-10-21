from __future__ import annotations

import urllib.request

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
