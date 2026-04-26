from __future__ import annotations

from dataclasses import dataclass

from app.config.settings import FastApiSettings


@dataclass(frozen=True)
class AppMetadata:
    title: str
    description: str
    version: str
    service_name: str
    environment: str

    @classmethod
    def from_settings(cls, settings: FastApiSettings) -> "AppMetadata":
        return cls(
            title=settings.app_name,
            description=(
                "dBaronX FastAPI intelligence, risk, AI, fraud, analytics, "
                "and DBX Solana verification layer."
            ),
            version=settings.app_version,
            service_name=settings.service_name,
            environment=settings.app_env,
        )

    def as_dict(self) -> dict[str, str]:
        return {
            "title": self.title,
            "description": self.description,
            "version": self.version,
            "serviceName": self.service_name,
            "environment": self.environment,
        }