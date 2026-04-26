from __future__ import annotations

import os
from dataclasses import dataclass, field


SENSITIVE_PARTS = (
    "TOKEN",
    "SECRET",
    "KEY",
    "PASSWORD",
    "AUTHORIZATION",
    "SERVICE_ROLE",
)


@dataclass(frozen=True)
class EnvReport:
    present: dict[str, bool] = field(default_factory=dict)
    safe_values: dict[str, str] = field(default_factory=dict)
    missing_required: list[str] = field(default_factory=list)

    def to_dict(self) -> dict:
        return {
            "present": self.present,
            "safeValues": self.safe_values,
            "missingRequired": self.missing_required,
        }


def is_sensitive(key: str) -> bool:
    upper = key.upper()
    return any(part in upper for part in SENSITIVE_PARTS)


def build_env_report(required: list[str] | None = None, safe_keys: list[str] | None = None) -> EnvReport:
    required = required or [
        "APP_ENV",
        "SERVICE_NAME",
        "INTERNAL_SERVICE_TOKEN",
        "SOLANA_RPC_URL",
        "DBX_MINT_ADDRESS",
    ]

    safe_keys = safe_keys or [
        "APP_ENV",
        "ENVIRONMENT",
        "NODE_ENV",
        "SERVICE_NAME",
        "APP_VERSION",
        "HOST",
        "PORT",
        "LOG_LEVEL",
        "CORS_ORIGINS",
        "SOLANA_RPC_URL",
        "DBX_MINT_ADDRESS",
        "DBX_DECIMALS",
    ]

    present = {key: bool(os.getenv(key)) for key in required}
    missing_required = [key for key, exists in present.items() if not exists]

    safe_values: dict[str, str] = {}
    for key in safe_keys:
        if is_sensitive(key):
            continue
        value = os.getenv(key)
        if value is not None:
            safe_values[key] = value

    return EnvReport(
        present=present,
        safe_values=safe_values,
        missing_required=missing_required,
    )