from __future__ import annotations

from dataclasses import dataclass

from app.config.settings import env_bool, env_int, env_string, get_fastapi_settings


@dataclass(frozen=True)
class UvicornRuntimeConfig:
    app_import: str
    host: str
    port: int
    workers: int
    reload: bool
    proxy_headers: bool
    forwarded_allow_ips: str
    log_level: str

    def as_kwargs(self) -> dict:
        if self.reload:
            return {
                "app": self.app_import,
                "host": self.host,
                "port": self.port,
                "reload": True,
                "workers": 1,
                "proxy_headers": self.proxy_headers,
                "forwarded_allow_ips": self.forwarded_allow_ips,
                "log_level": self.log_level,
            }

        return {
            "app": self.app_import,
            "host": self.host,
            "port": self.port,
            "workers": self.workers,
            "proxy_headers": self.proxy_headers,
            "forwarded_allow_ips": self.forwarded_allow_ips,
            "log_level": self.log_level,
        }


def build_uvicorn_config() -> UvicornRuntimeConfig:
    settings = get_fastapi_settings()
    reload_enabled = settings.app_env == "development" and env_bool("UVICORN_RELOAD", False)

    return UvicornRuntimeConfig(
        app_import=env_string("UVICORN_APP_IMPORT", "main:app"),
        host=settings.host,
        port=settings.port,
        workers=1 if reload_enabled else env_int("WEB_CONCURRENCY", 1),
        reload=reload_enabled,
        proxy_headers=True,
        forwarded_allow_ips=env_string("FORWARDED_ALLOW_IPS", "*"),
        log_level=env_string("LOG_LEVEL", "info").lower(),
    )