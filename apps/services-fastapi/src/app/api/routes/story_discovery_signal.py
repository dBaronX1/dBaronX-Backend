from __future__ import annotations

from fastapi import APIRouter, Depends

from app.schemas.story_discovery_signal import (
    StoryDiscoverySignalRequest,
    StoryDiscoverySignalResponse,
)
from app.services.story_discovery_signal_service import StoryDiscoverySignalService

router = APIRouter(prefix="/story-discovery-signal", tags=["story-discovery-signal"])


def story_discovery_signal_service_dep() -> StoryDiscoverySignalService:
    return StoryDiscoverySignalService()


@router.post("/evaluate", response_model=StoryDiscoverySignalResponse)
async def evaluate_story_discovery_signal(
    payload: StoryDiscoverySignalRequest,
    service: StoryDiscoverySignalService = Depends(
        story_discovery_signal_service_dep
    ),
):
    result = await service.evaluate(
        title=payload.title,
        content=payload.content,
        prompt=payload.prompt,
        language=payload.language,
        tags=payload.tags,
        historical_ctr=payload.historical_ctr,
        completion_rate=payload.completion_rate,
        save_rate=payload.save_rate,
        share_rate=payload.share_rate,
        recency_hours=payload.recency_hours,
        comparison_contents=payload.comparison_contents,
    )
    return StoryDiscoverySignalResponse(**result)
