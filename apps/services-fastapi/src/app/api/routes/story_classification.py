from __future__ import annotations

from fastapi import APIRouter, Depends

from app.schemas.story_classification import (
    StoryClassificationRequest,
    StoryClassificationResponse,
)
from app.services.story_classification_service import StoryClassificationService

router = APIRouter(prefix="/story-classification", tags=["story-classification"])


def story_classification_service_dep() -> StoryClassificationService:
    return StoryClassificationService()


@router.post("/classify", response_model=StoryClassificationResponse)
async def classify_story(
    payload: StoryClassificationRequest,
    service: StoryClassificationService = Depends(
        story_classification_service_dep
    ),
):
    result = service.classify(
        content=payload.content,
        prompt=payload.prompt,
        genre_hint=payload.genre_hint,
        tone_hint=payload.tone_hint,
        language_hint=payload.language_hint,
    )
    return StoryClassificationResponse(**result)
