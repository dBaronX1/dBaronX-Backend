from __future__ import annotations

import os
from dataclasses import dataclass, field

from app.config.settings import FastApiSettings, get_fastapi_settings


@dataclass
class StartupCheckReport:
    ok: bool
    failures: list[str] = field(default_factory=list)
    warnings: list[str] = field(default_factory=list)

    def as_dict(self) -> dict:
        return {
            "ok": self.ok,
            "failures": self.failures,
            "warnings": self.warnings,
        }


class AppStartupChecks:
    def __init__(self, settings: FastApiSettings | None = None) -> None:
        self.settings = settings or get_fastapi_settings()

    def run(self) -> StartupCheckReport:
        failures: list[str] = []
        warnings: list[str] = []

        if self.settings.production and self.settings.docs_enabled:
            warnings.append("Docs are enabled in production settings, but app should suppress them at runtime")

        if self.settings.require_internal_token and not self.settings.internal_service_token:
            failures.append("INTERNAL_SERVICE_TOKEN is missing")

        if self.settings.production and len(self.settings.internal_service_token) < 20:
            failures.append("INTERNAL_SERVICE_TOKEN is too short for production")

        if not self.settings.cors_origins:
            warnings.append("CORS_ORIGINS is empty; defaults should be used")

        if self.settings.max_body_bytes < 1024:
            failures.append("MAX_BODY_BYTES is too small")

        if self.settings.host not in {"0.0.0.0", "127.0.0.1", "localhost"} and self.settings.production:
            warnings.append("HOST is unusual for Render/Fly deployment")

        if not os.getenv("SOLANA_RPC_URL") and self.settings.production:
            warnings.append("SOLANA_RPC_URL is missing; public Solana RPC fallback may rate-limit production DBX payments")

        return StartupCheckReport(
            ok=len(failures) == 0,
            failures=failures,
            warnings=warnings,
        )

    def assert_ready(self) -> None:
        report = self.run()
        if not report.ok:
            raise RuntimeError(f"FastAPI startup checks failed: {report.failures}")