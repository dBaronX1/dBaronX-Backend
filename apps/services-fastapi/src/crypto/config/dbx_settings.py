from __future__ import annotations

import os
from dataclasses import dataclass
from functools import lru_cache
from typing import Literal


Environment = Literal["development", "test", "staging", "production"]


@dataclass(frozen=True)
class DbxSettings:
    app_env: Environment
    internal_service_token: str
    solana_rpc_url: str
    dbx_mint_address: str
    dbx_decimals: int
    dbx_treasury_wallet: str
    rpc_timeout_seconds: float
    require_finalized: bool
    max_transaction_age_seconds: int
    strict_startup_validation: bool

    @property
    def production(self) -> bool:
        return self.app_env == "production"

    @property
    def confirmation_statuses(self) -> set[str]:
        if self.require_finalized:
            return {"finalized"}
        return {"confirmed", "finalized"}

    def validate_for_startup(self) -> None:
        failures: list[str] = []

        if not self.internal_service_token:
            failures.append("INTERNAL_SERVICE_TOKEN is required")

        if self.production and len(self.internal_service_token) < 20:
            failures.append("INTERNAL_SERVICE_TOKEN must be at least 20 characters in production")

        if not self.solana_rpc_url.startswith(("http://", "https://")):
            failures.append("SOLANA_RPC_URL must be a valid HTTP(S) URL")

        if not is_base58ish(self.dbx_mint_address, min_len=32, max_len=44):
            failures.append("DBX_MINT_ADDRESS must be a valid Solana base58 address")

        if self.dbx_decimals != 9:
            failures.append("DBX_DECIMALS must be exactly 9")

        if self.dbx_treasury_wallet and not is_base58ish(
            self.dbx_treasury_wallet,
            min_len=32,
            max_len=44,
        ):
            failures.append("DBX_TREASURY_WALLET must be a valid Solana base58 address")

        if failures and (self.production or self.strict_startup_validation):
            raise RuntimeError("; ".join(failures))


def env_string(key: str, default: str = "") -> str:
    return str(os.getenv(key, default) or "").strip()


def env_int(key: str, default: int) -> int:
    raw = env_string(key, str(default))
    try:
        return int(raw)
    except ValueError:
        return default


def env_float(key: str, default: float) -> float:
    raw = env_string(key, str(default))
    try:
        return float(raw)
    except ValueError:
        return default


def env_bool(key: str, default: bool = False) -> bool:
    raw = env_string(key, "")
    if not raw:
        return default
    return raw.lower() in {"1", "true", "yes", "on", "enabled"}


def current_environment() -> Environment:
    raw = env_string("APP_ENV", env_string("ENVIRONMENT", env_string("NODE_ENV", "development")))
    lowered = raw.lower()
    if lowered in {"development", "test", "staging", "production"}:
        return lowered  # type: ignore[return-value]
    return "development"


def is_base58ish(value: str, *, min_len: int, max_len: int) -> bool:
    if not value or len(value) < min_len or len(value) > max_len:
        return False
    alphabet = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz"
    return all(char in alphabet for char in value)


@lru_cache(maxsize=1)
def get_dbx_settings() -> DbxSettings:
    settings = DbxSettings(
        app_env=current_environment(),
        internal_service_token=env_string(
            "INTERNAL_SERVICE_TOKEN",
            env_string("FASTAPI_INTERNAL_SERVICE_TOKEN", ""),
        ),
        solana_rpc_url=env_string(
            "SOLANA_RPC_URL",
            env_string("DBX_SOLANA_RPC_URL", "https://api.mainnet-beta.solana.com"),
        ),
        dbx_mint_address=env_string(
            "DBX_MINT_ADDRESS",
            "4ZdL7df7KoDTyVqAnQ398ofsykqsox2S834KQBXNQNYE",
        ),
        dbx_decimals=env_int("DBX_DECIMALS", 9),
        dbx_treasury_wallet=env_string("DBX_TREASURY_WALLET", ""),
        rpc_timeout_seconds=max(3.0, env_float("SOLANA_RPC_TIMEOUT_SECONDS", 12.0)),
        require_finalized=env_bool("DBX_REQUIRE_FINALIZED", False),
        max_transaction_age_seconds=max(
            60,
            env_int("DBX_MAX_TRANSACTION_AGE_SECONDS", 60 * 60 * 24),
        ),
        strict_startup_validation=env_bool("FASTAPI_STRICT_STARTUP_VALIDATION", True),
    )

    settings.validate_for_startup()
    return settings