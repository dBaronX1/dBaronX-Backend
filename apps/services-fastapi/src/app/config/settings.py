from __future__ import annotations

import os
from dataclasses import dataclass, field
from functools import lru_cache
from typing import Literal


AppEnvironment = Literal["development", "test", "staging", "production"]


def env_string(key: str, default: str = "") -> str:
    return str(os.getenv(key, default) or "").strip()


def env_int(key: str, default: int) -> int:
    raw = env_string(key, str(default))
    try:
      return int(raw)
    except ValueError:
      return default


def env_bool(key: str, default: bool = False) -> bool:
    raw = env_string(key, "")
    if not raw:
        return default
    return raw.lower() in {"1", "true", "yes", "on", "enabled"}


def env_csv(key: str, default: list[str] | None = None) -> list[str]:
    raw = env_string(key, "")
    if not raw:
        return default or []
    return [item.strip() for item in raw.split(",") if item.strip()]


def current_environment() -> AppEnvironment:
    raw = env_string("APP_ENV", env_string("ENVIRONMENT", env_string("NODE_ENV", "development")))
    lowered = raw.lower()
    if lowered in {"development", "test", "staging", "production"}:
        return lowered  # type: ignore[return-value]
    return "development"


@dataclass(frozen=True)
class FastApiSettings:
    app_name: str
    service_name: str
    app_env: AppEnvironment
    app_version: str
    host: str
    port: int
    docs_enabled: bool
    strict_route_mount: bool
    strict_startup_validation: bool
    require_internal_token: bool
    cors_origins: list[str] = field(default_factory=list)
    max_body_bytes: int = 2 * 1024 * 1024
    max_webhook_body_bytes: int = 2 * 1024 * 1024
    max_upload_body_bytes: int = 12 * 1024 * 1024
    request_timeout_seconds: int = 30
    internal_service_token: str = ""

    @property
    def production(self) -> bool:
        return self.app_env == "production"

    @property
    def docs_url(self) -> str | None:
        return "/docs" if self.docs_enabled and not self.production else None

    @property
    def redoc_url(self) -> str | None:
        return "/redoc" if self.docs_enabled and not self.production else None

    @property
    def openapi_url(self) -> str | None:
        return "/openapi.json" if self.docs_enabled and not self.production else None

    def validate(self) -> None:
        failures: list[str] = []

        if self.port <= 0 or self.port > 65535:
            failures.append("PORT must be between 1 and 65535")

        if self.require_internal_token and not self.internal_service_token:
            failures.append("INTERNAL_SERVICE_TOKEN is required")

        if self.production and len(self.internal_service_token) < 20:
            failures.append("INTERNAL_SERVICE_TOKEN must be at least 20 characters in production")

        if self.max_body_bytes < 1024:
            failures.append("MAX_BODY_BYTES must be at least 1024")

        if failures and (self.production or self.strict_startup_validation):
            raise RuntimeError("; ".join(failures))


@lru_cache(maxsize=1)
def get_fastapi_settings() -> FastApiSettings:
    env = current_environment()

    settings = FastApiSettings(
        app_name=env_string("APP_NAME", "dBaronX FastAPI Intelligence"),
        service_name=env_string("SERVICE_NAME", "dbaronx-fastapi"),
        app_env=env,
        app_version=env_string("APP_VERSION", "1.0.0"),
        host=env_string("HOST", "0.0.0.0"),
        port=env_int("PORT", 8080),
        docs_enabled=not env_bool("DISABLE_DOCS", False),
        strict_route_mount=env_bool("FASTAPI_STRICT_ROUTE_MOUNT", True),
        strict_startup_validation=env_bool("FASTAPI_STRICT_STARTUP_VALIDATION", True),
        require_internal_token=env_bool("FASTAPI_REQUIRE_INTERNAL_TOKEN", True),
        cors_origins=env_csv(
            "CORS_ORIGINS",
            [
                "https://dbaronx.com",
                "https://www.dbaronx.com",
                "http://localhost:3000",
                "http://localhost:3001",
            ],
        ),
        max_body_bytes=env_int("MAX_BODY_BYTES", 2 * 1024 * 1024),
        max_webhook_body_bytes=env_int("MAX_WEBHOOK_BODY_BYTES", 2 * 1024 * 1024),
        max_upload_body_bytes=env_int("MAX_UPLOAD_BODY_BYTES", 12 * 1024 * 1024),
        request_timeout_seconds=env_int("REQUEST_TIMEOUT_SECONDS", 30),
        internal_service_token=env_string(
            "INTERNAL_SERVICE_TOKEN",
            env_string("FASTAPI_INTERNAL_SERVICE_TOKEN", ""),
        ),
    )

    settings.validate()
    return settings