from __future__ import annotations

from typing import Any

from app.core.settings import get_settings


class RuntimeDependencyManifestService:
    """
    Canonical runtime dependency manifest.

    This is a configuration- and dependency-facing operational surface that
    helps verify whether the FastAPI intelligence layer has enough wiring for
    launch integration with NestJS, Supabase/Postgres, Redis, and AI providers.
    """

    def build(self) -> dict[str, Any]:
        settings = get_settings()

        manifest = {
            "internal_service_token_configured": bool(
                getattr(settings, "INTERNAL_SERVICE_TOKEN", None)
            ),
            "database_url_configured": bool(
                getattr(settings, "DATABASE_URL", None)
                or getattr(settings, "POSTGRES_DSN", None)
                or getattr(settings, "SUPABASE_DB_URL", None)
            ),
            "redis_configured": bool(
                getattr(settings, "REDIS_URL", None)
            ),
            "openai_configured": bool(
                getattr(settings, "OPENAI_API_KEY", None)
            ),
            "anthropic_configured": bool(
                getattr(settings, "ANTHROPIC_API_KEY", None)
            ),
            "gemini_configured": bool(
                getattr(settings, "GEMINI_API_KEY", None)
            ),
            "environment": str(getattr(settings, "ENVIRONMENT", "unknown")),
        }

        launch_dependencies_ready = all(
            [
                manifest["internal_service_token_configured"],
                manifest["database_url_configured"],
            ]
        )

        return {
            "success": True,
            "runtime_dependency_manifest": {
                "launch_dependencies_ready": launch_dependencies_ready,
                "dependencies": manifest,
            },
        }
