from __future__ import annotations

from fastapi import APIRouter, Depends

from app.schemas.story_card_payload import (
    StoryCardPayloadRequest,
    StoryCardPayloadResponse,
)
from app.services.story_card_payload_service import StoryCardPayloadService

router = APIRouter(prefix="/story-card-payload", tags=["story-card-payload"])


def story_card_payload_service_dep() -> StoryCardPayloadService:
    return StoryCardPayloadService()


@router.post("/build", response_model=StoryCardPayloadResponse)
async def build_story_card_payload(
    payload: StoryCardPayloadRequest,
    service: StoryCardPayloadService = Depends(
        story_card_payload_service_dep
    ),
):
    result = service.build(
        story_id=payload.story_id,
        title=payload.title,
        content=payload.content,
        excerpt=payload.excerpt,
        genre=payload.genre,
        tone=payload.tone,
        audience=payload.audience,
        cover_image_url=payload.cover_image_url,
        creator_id=payload.creator_id,
        creator_name=payload.creator_name,
        tags=payload.tags,
        published_at=payload.published_at,
        slug=payload.slug,
        visibility=payload.visibility,
        status=payload.status,
        promotion_state=payload.promotion_state,
        affiliate_eligible=payload.affiliate_eligible,
        ad_eligible=payload.ad_eligible,
    )
    return StoryCardPayloadResponse(**result)
