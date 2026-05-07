from __future__ import annotations

from importlib.util import find_spec
from typing import Any

from app.core.config import get_settings


def _package_installed(module_name: str) -> bool:
    try:
        return find_spec(module_name) is not None
    except ModuleNotFoundError:
        return False


class RuntimeDependencyManifestService:
    """
    Canonical runtime dependency manifest.

    Core launch dependencies are required. AI providers are independently
    reported as configured/installed/available so one missing optional provider
    does not mask other working provider paths or deterministic fallbacks.
    """

    def build(self) -> dict[str, Any]:
        settings = get_settings()

        provider_dependencies = {
            "anthropic": {
                "configured": bool(settings.anthropic_api_key),
                "package_installed": _package_installed("anthropic"),
                "required": bool(settings.anthropic_api_key),
            },
            "openai": {
                "configured": bool(settings.openai_api_key),
                "package_installed": _package_installed("openai"),
                "required": bool(settings.openai_api_key),
            },
            "gemini": {
                "configured": bool(settings.gemini_api_key),
                "package_installed": _package_installed("google.generativeai"),
                "required": bool(settings.gemini_api_key),
            },
        }
        for provider in provider_dependencies.values():
            provider["available"] = (
                provider["configured"] is True
                and provider["package_installed"] is True
            )

        missing_required_provider_dependencies = sorted(
            name
            for name, provider in provider_dependencies.items()
            if provider["required"] is True and provider["package_installed"] is not True
        )

        manifest = {
            "internal_service_token_configured": bool(settings.internal_service_token),
            "database_url_configured": bool(
                settings.supabase_url and settings.supabase_service_role_key
            ),
            "redis_configured": bool(settings.redis_url),
            "ai_providers": provider_dependencies,
            "ai_provider_available": any(
                provider["available"] is True for provider in provider_dependencies.values()
            ),
            "missing_required_provider_dependencies": missing_required_provider_dependencies,
            "environment": settings.app_env,
        }

        launch_dependencies_ready = all(
            [
                manifest["internal_service_token_configured"],
                manifest["database_url_configured"],
                not missing_required_provider_dependencies,
            ]
        )

        return {
            "success": True,
            "runtime_dependency_manifest": {
                "launch_dependencies_ready": launch_dependencies_ready,
                "dependencies": manifest,
            },
        }
