from __future__ import annotations

from fastapi import APIRouter, Depends

from app.schemas.story_creator_signal import (
    StoryCreatorSignalRequest,
    StoryCreatorSignalResponse,
)
from app.services.story_creator_signal_service import StoryCreatorSignalService

router = APIRouter(prefix="/story-creator-signal", tags=["story-creator-signal"])


def story_creator_signal_service_dep() -> StoryCreatorSignalService:
    return StoryCreatorSignalService()


@router.post("/evaluate", response_model=StoryCreatorSignalResponse)
async def evaluate_story_creator_signal(
    payload: StoryCreatorSignalRequest,
    service: StoryCreatorSignalService = Depends(story_creator_signal_service_dep),
):
    result = service.evaluate(
        total_published=payload.total_published,
        publication_acceptance_rate=payload.publication_acceptance_rate,
        moderation_rejection_rate=payload.moderation_rejection_rate,
        average_story_quality_score=payload.average_story_quality_score,
        average_completion_rate=payload.average_completion_rate,
        average_share_rate=payload.average_share_rate,
        average_save_rate=payload.average_save_rate,
        recent_policy_flags=payload.recent_policy_flags,
        days_since_first_publish=payload.days_since_first_publish,
    )
    return StoryCreatorSignalResponse(**result)
