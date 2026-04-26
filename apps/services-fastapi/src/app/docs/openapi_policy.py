from __future__ import annotations

from dataclasses import dataclass

from app.config.settings import FastApiSettings


@dataclass(frozen=True)
class OpenApiPolicy:
    settings: FastApiSettings

    @property
    def docs_url(self) -> str | None:
        if self.settings.production:
            return None
        return "/docs" if self.settings.docs_enabled else None

    @property
    def redoc_url(self) -> str | None:
        if self.settings.production:
            return None
        return "/redoc" if self.settings.docs_enabled else None

    @property
    def openapi_url(self) -> str | None:
        if self.settings.production:
            return None
        return "/openapi.json" if self.settings.docs_enabled else None

    def as_dict(self) -> dict[str, str | None | bool]:
        return {
            "docsEnabled": self.settings.docs_enabled and not self.settings.production,
            "docsUrl": self.docs_url,
            "redocUrl": self.redoc_url,
            "openapiUrl": self.openapi_url,
        }