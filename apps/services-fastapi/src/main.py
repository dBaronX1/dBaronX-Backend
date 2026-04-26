from __future__ import annotations

import logging
import os
from typing import Any

import uvicorn

try:
    from app.app_factory import create_app
except ImportError:
    from src.app.app_factory import create_app  # type: ignore


logging.basicConfig(
    level=os.getenv("LOG_LEVEL", "info").upper(),
    format="%(asctime)s | %(levelname)s | %(name)s | %(message)s",
)

logger = logging.getLogger("dbaronx.fastapi.main")

app = create_app()


def _int_env(name: str, default: int) -> int:
    raw = os.getenv(name)

    if raw is None or raw.strip() == "":
        return default

    try:
        return int(raw)
    except ValueError:
        logger.warning("Invalid integer env %s=%s. Falling back to %s.", name, raw, default)
        return default


def _bool_env(name: str, default: bool = False) -> bool:
    raw = os.getenv(name)

    if raw is None or raw.strip() == "":
        return default

    return raw.strip().lower() in {"1", "true", "yes", "on"}


def runtime_config() -> dict[str, Any]:
    app_env = os.getenv("APP_ENV", os.getenv("NODE_ENV", "development")).lower()
    reload_enabled = app_env == "development" and _bool_env("UVICORN_RELOAD", False)

    return {
        "host": os.getenv("HOST", "0.0.0.0"),
        "port": _int_env("PORT", 8080),
        "reload": reload_enabled,
        "workers": 1 if reload_enabled else _int_env("WEB_CONCURRENCY", 1),
        "proxy_headers": True,
        "forwarded_allow_ips": os.getenv("FORWARDED_ALLOW_IPS", "*"),
        "log_level": os.getenv("LOG_LEVEL", "info").lower(),
    }


if __name__ == "__main__":
    config = runtime_config()

    if config["reload"]:
        uvicorn.run(
            "main:app",
            host=config["host"],
            port=config["port"],
            reload=True,
            workers=1,
            proxy_headers=config["proxy_headers"],
            forwarded_allow_ips=config["forwarded_allow_ips"],
            log_level=config["log_level"],
        )
    else:
        uvicorn.run(
            app,
            host=config["host"],
            port=config["port"],
            workers=config["workers"],
            proxy_headers=config["proxy_headers"],
            forwarded_allow_ips=config["forwarded_allow_ips"],
            log_level=config["log_level"],
        )
