from __future__ import annotations

from typing import Any


class ProviderHealthService:
    """
    Consolidates provider health status from multiple LLM providers.

    Expected provider payload shape:
    {
      "configured": bool,
      "name": str,
      "model": str | None
    }
    """

    def summarize(self, providers: dict[str, dict[str, Any]]) -> dict[str, Any]:
        total = len(providers)
        configured = [name for name, meta in providers.items() if meta.get("configured")]
        missing = [name for name, meta in providers.items() if not meta.get("configured")]

        if total == 0:
            status = "not_configured"
        elif len(configured) == total:
            status = "healthy"
        elif configured:
            status = "degraded"
        else:
            status = "down"

        fallback_chain = [name for name in providers.keys() if name in configured]

        return {
            "status": status,
            "total_provider_count": total,
            "configured_provider_count": len(configured),
            "configured_providers": configured,
            "missing_providers": missing,
            "fallback_chain": fallback_chain,
            "multi_provider_resilience": len(configured) >= 2,
        }
