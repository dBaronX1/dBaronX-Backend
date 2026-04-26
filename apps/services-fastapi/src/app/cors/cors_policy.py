from __future__ import annotations

from dataclasses import dataclass

from app.config.settings import FastApiSettings


@dataclass(frozen=True)
class CorsPolicy:
    settings: FastApiSettings

    @property
    def allow_origins(self) -> list[str]:
        origins = self.settings.cors_origins or [
            "https://dbaronx.com",
            "https://www.dbaronx.com",
            "http://localhost:3000",
            "http://localhost:3001",
        ]

        if self.settings.production:
            return [
                origin
                for origin in origins
                if origin.startswith("https://")
            ]

        return origins

    @property
    def allow_credentials(self) -> bool:
        return True

    @property
    def allow_methods(self) -> list[str]:
        return ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"]

    @property
    def allow_headers(self) -> list[str]:
        return [
            "Authorization",
            "Content-Type",
            "X-Request-Id",
            "X-Actor-Id",
            "X-Internal-Token",
            "X-Internal-Service-Token",
            "X-Service-Token",
            "X-Service-Name",
            "Idempotency-Key",
        ]

    @property
    def expose_headers(self) -> list[str]:
        return [
            "X-Request-Id",
            "X-Response-Time-Ms",
            "X-Dbx-Duration-Ms",
        ]

    @property
    def max_age(self) -> int:
        return 600