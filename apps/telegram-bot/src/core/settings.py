from __future__ import annotations

from functools import lru_cache

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    APP_NAME: str = "dbaronx-telegram-bot"
    ENVIRONMENT: str = Field(default="development")
    LOG_LEVEL: str = Field(default="INFO")

    TELEGRAM_BOT_TOKEN: str
    TELEGRAM_WEBHOOK_SECRET: str | None = None
    TELEGRAM_ADMIN_IDS: str = Field(default="")

    NESTJS_BASE_URL: str
    FASTAPI_BASE_URL: str
    INTERNAL_SERVICE_TOKEN: str

    REQUEST_TIMEOUT_SECONDS: int = Field(default=20)
    ENABLE_WEBHOOK_SIGNATURE_CHECK: bool = Field(default=False)

    @property
    def admin_id_set(self) -> set[str]:
        raw = self.TELEGRAM_ADMIN_IDS.strip()
        if not raw:
            return set()
        return {part.strip() for part in raw.split(",") if part.strip()}


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    return Settings()
