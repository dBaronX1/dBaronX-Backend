from __future__ import annotations

from functools import lru_cache
from typing import Literal

from pydantic import AnyHttpUrl, Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    app_name: str = Field(default="dBaronX FastAPI")
    app_env: Literal["development", "test", "staging", "production"] = "development"
    app_host: str = "0.0.0.0"
    app_port: int = 8080
    app_version: str = "1.0.0"
    app_debug: bool = False
    app_docs_enabled: bool = False
    app_log_level: Literal["DEBUG", "INFO", "WARNING", "ERROR", "CRITICAL"] = "INFO"

    cors_origins: str = ""
    trusted_proxy_depth: int = 1

    nestjs_base_url: AnyHttpUrl
    frontend_url: AnyHttpUrl

    supabase_url: str
    supabase_service_role_key: str

    redis_url: str | None = None

    internal_service_token: str = Field(min_length=16)
    jwt_secret: str = Field(min_length=16)
    jwt_algorithm: str = "HS256"

    openai_api_key: str | None = None
    openai_model: str = "gpt-4o"
    anthropic_api_key: str | None = None
    anthropic_model: str = "claude-3-5-sonnet-latest"
    gemini_api_key: str | None = None
    gemini_model: str = "gemini-1.5-pro"

    cloudflare_turnstile_secret: str | None = None

    request_timeout_seconds: float = 20.0
    risk_cache_ttl_seconds: int = 300
    idempotency_ttl_seconds: int = 900
    max_request_body_bytes: int = 2 * 1024 * 1024

    watch_min_duration_seconds: int = 5
    risk_default_allow_on_dependency_failure: bool = True

    @field_validator("cors_origins")
    @classmethod
    def normalize_cors_origins(cls, value: str) -> str:
        return ",".join(
            item.strip()
            for item in value.split(",")
            if item and item.strip()
        )

    @property
    def docs_url(self) -> str | None:
        return "/docs" if self.app_docs_enabled else None

    @property
    def redoc_url(self) -> str | None:
        return "/redoc" if self.app_docs_enabled else None

    @property
    def openapi_url(self) -> str | None:
        return "/openapi.json" if self.app_docs_enabled else None

    @property
    def cors_origin_list(self) -> list[str]:
        if not self.cors_origins.strip():
            return []
        return [item.strip() for item in self.cors_origins.split(",") if item.strip()]

    @property
    def is_production(self) -> bool:
        return self.app_env == "production"

    @property
    def has_ai_provider(self) -> bool:
        return bool(self.openai_api_key or self.anthropic_api_key or self.gemini_api_key)


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    return Settings()


# Backward-compatible lazy settings proxy for legacy provider modules that
# still import ``settings`` and use upper-case attribute names. New code should
# use get_settings() and lower-case Settings fields.
class _SettingsProxy:
    def __getattr__(self, name: str):
        return getattr(get_settings(), name)


settings = _SettingsProxy()

# Legacy upper-case attribute shims.  These preserve runtime provider capability
# while the service layer converges on pydantic-settings field names.
Settings.OPENAI_API_KEY = property(lambda self: self.openai_api_key)
Settings.OPENAI_MODEL = property(lambda self: self.openai_model)
Settings.ANTHROPIC_API_KEY = property(lambda self: self.anthropic_api_key)
Settings.ANTHROPIC_MODEL = property(lambda self: self.anthropic_model)
Settings.GEMINI_API_KEY = property(lambda self: self.gemini_api_key)
Settings.GEMINI_MODEL = property(lambda self: self.gemini_model)
Settings.INTERNAL_SERVICE_TOKEN = property(lambda self: self.internal_service_token)
Settings.JWT_SECRET = property(lambda self: self.jwt_secret)
Settings.REDIS_URL = property(lambda self: self.redis_url)
Settings.ENVIRONMENT = property(lambda self: self.app_env)
