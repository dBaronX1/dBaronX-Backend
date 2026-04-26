from __future__ import annotations

from fastapi import APIRouter, Depends

from app.api.dependencies.ai_dependencies import llm_orchestrator_service_dep
from app.services.llm_orchestrator_service import LLMOrchestratorService
from app.services.provider_health_service import ProviderHealthService

router = APIRouter(prefix="/provider-health", tags=["provider-health"])


def provider_health_service_dep() -> ProviderHealthService:
    return ProviderHealthService()


@router.get("")
async def provider_health(
    orchestrator: LLMOrchestratorService = Depends(llm_orchestrator_service_dep),
    service: ProviderHealthService = Depends(provider_health_service_dep),
):
    providers = orchestrator.provider_status()
    summary = service.summarize(providers)

    return {
        "success": summary["status"] in {"healthy", "degraded"},
        "service": "fastapi-intelligence",
        "providers": providers,
        "summary": summary,
    }
