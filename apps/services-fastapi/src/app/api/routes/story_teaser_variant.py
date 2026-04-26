from __future__ import annotations

from fastapi import APIRouter, Depends

from app.schemas.story_teaser_variant import (
    StoryTeaserVariantRequest,
    StoryTeaserVariantResponse,
)
from app.services.story_teaser_variant_service import StoryTeaserVariantService

router = APIRouter(prefix="/story-teaser-variant", tags=["story-teaser-variant"])


def story_teaser_variant_service_dep() -> StoryTeaserVariantService:
    return StoryTeaserVariantService()


@router.post("/build", response_model=StoryTeaserVariantResponse)
async def build_story_teaser_variants(
    payload: StoryTeaserVariantRequest,
    service: StoryTeaserVariantService = Depends(
        story_teaser_variant_service_dep
    ),
):
    result = service.build(
        title=payload.title,
        excerpt=payload.excerpt,
        genre=payload.genre,
        tone=payload.tone,
        audience=payload.audience,
        cta_target=payload.cta_target,
        max_variants=payload.max_variants,
    )
    return StoryTeaserVariantResponse(**result)
