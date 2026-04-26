from __future__ import annotations

from fastapi import APIRouter, Depends

from app.schemas.story_quote_signal import (
    StoryQuoteSignalRequest,
    StoryQuoteSignalResponse,
)
from app.services.story_quote_signal_service import StoryQuoteSignalService

router = APIRouter(prefix="/story-quote-signal", tags=["story-quote-signal"])


def story_quote_signal_service_dep() -> StoryQuoteSignalService:
    return StoryQuoteSignalService()


@router.post("/evaluate", response_model=StoryQuoteSignalResponse)
async def evaluate_story_quote_signal(
    payload: StoryQuoteSignalRequest,
    service: StoryQuoteSignalService = Depends(
        story_quote_signal_service_dep
    ),
):
    result = await service.evaluate(
        title=payload.title,
        content=payload.content,
        creator_profile=payload.creator_profile,
        prompt=payload.prompt,
        language=payload.language,
        tags=payload.tags,
        target_channel=payload.target_channel,
        comparison_contents=payload.comparison_contents,
        market_context=payload.market_context,
    )
    return StoryQuoteSignalResponse(**result)
