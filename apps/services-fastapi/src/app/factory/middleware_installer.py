from __future__ import annotations

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config.settings import FastApiSettings
from app.cors.cors_policy import CorsPolicy
from app.middleware.body_limit import BodyLimitMiddleware
from app.middleware.request_context import RequestContextMiddleware
from app.middleware.security_headers import SecurityHeadersMiddleware


class MiddlewareInstaller:
    def __init__(self, settings: FastApiSettings) -> None:
        self.settings = settings
        self.cors = CorsPolicy(settings)

    def install(self, app: FastAPI) -> None:
        app.add_middleware(
            CORSMiddleware,
            allow_origins=self.cors.allow_origins,
            allow_credentials=self.cors.allow_credentials,
            allow_methods=self.cors.allow_methods,
            allow_headers=self.cors.allow_headers,
            expose_headers=self.cors.expose_headers,
            max_age=self.cors.max_age,
        )

        app.add_middleware(SecurityHeadersMiddleware)
        app.add_middleware(BodyLimitMiddleware)
        app.add_middleware(RequestContextMiddleware)

        app.state.middleware_installed = [
            "CORSMiddleware",
            "SecurityHeadersMiddleware",
            "BodyLimitMiddleware",
            "RequestContextMiddleware",
        ]