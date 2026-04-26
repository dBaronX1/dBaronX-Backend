from __future__ import annotations

from fastapi import FastAPI

from app.factory.app_builder import build_app


def load_app() -> FastAPI:
    """
    Canonical FastAPI application loader.

    This keeps `main.py` lightweight while the full production app is built
    through the factory layer.
    """
    return build_app()


def load_app_for_tests() -> FastAPI:
    app = build_app()
    app.state.test_mode = True
    return app