from __future__ import annotations

from fastapi import APIRouter, Depends

from app.schemas.launch_readiness_score import (
    LaunchReadinessScoreResponse,
)
from app.services.launch_readiness_score_service import (
    LaunchReadinessScoreService,
)

router = APIRouter(
    prefix="/launch-readiness-score",
    tags=["launch-readiness-score"],
)


def launch_readiness_score_service_dep() -> LaunchReadinessScoreService:
    return LaunchReadinessScoreService()


@router.get("/snapshot", response_model=LaunchReadinessScoreResponse)
async def get_launch_readiness_score_snapshot(
    service: LaunchReadinessScoreService = Depends(
        launch_readiness_score_service_dep
    ),
):
    result = service.build()
    return LaunchReadinessScoreResponse(**result)
