from __future__ import annotations

from fastapi import APIRouter, Depends

from app.schemas.story_summary import StorySummaryRequest, StorySummaryResponse
from app.services.story_summary_service import StorySummaryService

router = APIRouter(prefix="/story-summary", tags=["story-summary"])


def story_summary_service_dep() -> StorySummaryService:
    return StorySummaryService()


@router.post("/run", response_model=StorySummaryResponse)
async def summarize_story(
    payload: StorySummaryRequest,
    service: StorySummaryService = Depends(story_summary_service_dep),
):
    result = await service.summarize(
        content=payload.content,
        summary_style=payload.summary_style,
        target_sentences=payload.target_sentences,
        language=payload.language,
        spoiler_safe=payload.spoiler_safe,
    )
    return StorySummaryResponse(**result)
