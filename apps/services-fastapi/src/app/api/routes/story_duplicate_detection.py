from __future__ import annotations

from fastapi import APIRouter, Depends

from app.schemas.story_duplicate_detection import (
    StoryDuplicateDetectionRequest,
    StoryDuplicateDetectionResponse,
)
from app.services.story_duplicate_detection_service import (
    StoryDuplicateDetectionService,
)

router = APIRouter(
    prefix="/story-duplicate-detection",
    tags=["story-duplicate-detection"],
)


def story_duplicate_detection_service_dep() -> StoryDuplicateDetectionService:
    return StoryDuplicateDetectionService()


@router.post("/run", response_model=StoryDuplicateDetectionResponse)
async def run_story_duplicate_detection(
    payload: StoryDuplicateDetectionRequest,
    service: StoryDuplicateDetectionService = Depends(
        story_duplicate_detection_service_dep
    ),
):
    result = service.analyze(
        content=payload.content,
        comparison_contents=payload.comparison_contents,
        threshold=payload.threshold,
    )
    return StoryDuplicateDetectionResponse(**result)
