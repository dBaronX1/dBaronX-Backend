from __future__ import annotations

from fastapi import APIRouter, Depends

from app.schemas.story_publication_readiness import (
    StoryPublicationReadinessRequest,
    StoryPublicationReadinessResponse,
)
from app.services.story_publication_readiness_service import (
    StoryPublicationReadinessService,
)

router = APIRouter(
    prefix="/story-publication-readiness",
    tags=["story-publication-readiness"],
)


def story_publication_readiness_service_dep() -> StoryPublicationReadinessService:
    return StoryPublicationReadinessService()


@router.post("/evaluate", response_model=StoryPublicationReadinessResponse)
async def evaluate_story_publication_readiness(
    payload: StoryPublicationReadinessRequest,
    service: StoryPublicationReadinessService = Depends(
        story_publication_readiness_service_dep
    ),
):
    result = await service.evaluate(
        title=payload.title,
        content=payload.content,
        prompt=payload.prompt,
        comparison_contents=payload.comparison_contents,
        language=payload.language,
        require_excerpt=payload.require_excerpt,
        require_summary=payload.require_summary,
    )
    return StoryPublicationReadinessResponse(**result)
