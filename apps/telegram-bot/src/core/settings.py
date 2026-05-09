from __future__ import annotations

from functools import lru_cache

from pydantic import AliasChoices, Field
from pydantic_settings import BaseSettings, SettingsConfigDict

from core.roles import Role, parse_role


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    APP_NAME: str = "dbaronx-telegram-bot"
    ENVIRONMENT: str = Field(default="development", validation_alias=AliasChoices("BOT_ENV", "ENVIRONMENT"))
    BOT_ENV: str = Field(default="development")
    LOG_LEVEL: str = Field(default="INFO")
    HOST: str = Field(default="0.0.0.0")
    PORT: int = Field(default=8081)

    TELEGRAM_BOT_TOKEN: str = ""
    TELEGRAM_WEBHOOK_SECRET: str | None = None
    TELEGRAM_ALLOWED_ADMIN_IDS: str = Field(default="", validation_alias=AliasChoices("TELEGRAM_ALLOWED_ADMIN_IDS", "TELEGRAM_ADMIN_IDS"))
    TELEGRAM_ADMIN_IDS: str = Field(default="")
    TELEGRAM_ADMIN_ROLES: str = Field(default="")
    TELEGRAM_ADMIN_USERNAMES: str = Field(default="")
    TELEGRAM_ADMIN_CHAT_IDS: str = Field(default="")

    API_BASE_URL: str = Field(default="https://dbaronx-api-unified.onrender.com", validation_alias=AliasChoices("API_BASE_URL", "NESTJS_BASE_URL"))
    NESTJS_BASE_URL: str = Field(default="https://dbaronx-api-unified.onrender.com")
    FASTAPI_BASE_URL: str = ""
    MEDUSA_BASE_URL: str = "https://dbaronx-medusa.onrender.com"
    INTERNAL_SERVICE_TOKEN: str = ""
    BOT_PUBLIC_BASE_URL: str = Field(default="", validation_alias=AliasChoices("BOT_PUBLIC_BASE_URL", "TELEGRAM_BOT_PUBLIC_BASE_URL"))
    TELEGRAM_BOT_PUBLIC_BASE_URL: str = ""

    REQUEST_TIMEOUT_SECONDS: int = Field(default=12)
    REQUEST_RETRY_COUNT: int = Field(default=2)
    ENABLE_WEBHOOK_SIGNATURE_CHECK: bool = Field(default=True)
    MAX_WEBHOOK_BODY_BYTES: int = Field(default=1_048_576)

    @property
    def api_base_url(self) -> str:
        return (self.API_BASE_URL or self.NESTJS_BASE_URL).rstrip("/")

    @property
    def fastapi_base_url(self) -> str:
        return self.FASTAPI_BASE_URL.rstrip("/")

    @property
    def medusa_base_url(self) -> str:
        return self.MEDUSA_BASE_URL.rstrip("/")

    @property
    def admin_id_set(self) -> set[str]:
        ids = _parse_csv_set(self.TELEGRAM_ALLOWED_ADMIN_IDS) | _parse_csv_set(self.TELEGRAM_ADMIN_IDS)
        return ids

    @property
    def admin_role_map(self) -> dict[str, Role]:
        # Format: 123:OWNER,456:OPS. IDs without explicit roles are OWNER.
        roles: dict[str, Role] = {admin_id: Role.OWNER for admin_id in self.admin_id_set}
        for part in _parse_csv_list(self.TELEGRAM_ADMIN_ROLES):
            if ":" not in part:
                continue
            user_id, role = part.split(":", 1)
            user_id = user_id.strip()
            if user_id:
                roles[user_id] = parse_role(role)
        return roles

    @property
    def admin_username_set(self) -> set[str]:
        usernames = _parse_csv_set(self.TELEGRAM_ADMIN_USERNAMES)
        return {name.removeprefix("@").lower() for name in usernames if name}

    @property
    def admin_chat_id_set(self) -> set[str]:
        return _parse_csv_set(self.TELEGRAM_ADMIN_CHAT_IDS)

    def startup_blockers(self) -> list[str]:
        blockers: list[str] = []
        if not self.TELEGRAM_BOT_TOKEN:
            blockers.append("TELEGRAM_BOT_TOKEN_missing")
        if self.ENABLE_WEBHOOK_SIGNATURE_CHECK and not self.TELEGRAM_WEBHOOK_SECRET:
            blockers.append("TELEGRAM_WEBHOOK_SECRET_missing")
        if not self.admin_id_set and not self.admin_username_set and not self.admin_chat_id_set:
            blockers.append("TELEGRAM_ALLOWED_ADMIN_IDS_missing")
        if not self.api_base_url:
            blockers.append("API_BASE_URL_missing")
        if not self.fastapi_base_url:
            blockers.append("FASTAPI_BASE_URL_missing")
        if not self.medusa_base_url:
            blockers.append("MEDUSA_BASE_URL_missing")
        if not self.INTERNAL_SERVICE_TOKEN:
            blockers.append("INTERNAL_SERVICE_TOKEN_missing")
        if not (self.BOT_PUBLIC_BASE_URL or self.TELEGRAM_BOT_PUBLIC_BASE_URL):
            blockers.append("BOT_PUBLIC_BASE_URL_missing")
        return blockers


def _parse_csv_list(raw_value: str) -> list[str]:
    raw = (raw_value or "").strip()
    if not raw:
        return []
    return [part.strip() for part in raw.split(",") if part.strip()]


def _parse_csv_set(raw_value: str) -> set[str]:
    return set(_parse_csv_list(raw_value))


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    return Settings()
