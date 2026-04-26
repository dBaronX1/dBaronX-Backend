from __future__ import annotations

from fastapi import APIRouter, Depends

from app.api.dependencies.ai_dependencies import llm_orchestrator_service_dep
from app.services.llm_orchestrator_service import LLMOrchestratorService

router = APIRouter(prefix="/health/ai", tags=["health-ai"])


@router.get("")
async def ai_health(
    orchestrator: LLMOrchestratorService = Depends(llm_orchestrator_service_dep),
):
    providers = orchestrator.provider_status()

    available = [name for name, meta in providers.items() if meta.get("configured")]
    degraded = len(available) == 0

    return {
        "success": not degraded,
        "service": "fastapi-intelligence",
        "status": "degraded" if degraded else "healthy",
        "providers": providers,
        "available_provider_count": len(available),
    }
