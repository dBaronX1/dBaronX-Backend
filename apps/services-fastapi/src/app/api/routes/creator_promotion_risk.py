from __future__ import annotations

from fastapi import APIRouter, Depends

from app.schemas.creator_promotion_risk import (
    CreatorPromotionRiskRequest,
    CreatorPromotionRiskResponse,
)
from app.services.creator_promotion_risk_service import (
    CreatorPromotionRiskService,
)

router = APIRouter(
    prefix="/creator-promotion-risk",
    tags=["creator-promotion-risk"],
)


def creator_promotion_risk_service_dep() -> CreatorPromotionRiskService:
    return CreatorPromotionRiskService()


@router.post("/evaluate", response_model=CreatorPromotionRiskResponse)
async def evaluate_creator_promotion_risk(
    payload: CreatorPromotionRiskRequest,
    service: CreatorPromotionRiskService = Depends(
        creator_promotion_risk_service_dep
    ),
):
    result = await service.evaluate(
        creator_account_id=payload.creator_account_id,
        title=payload.title,
        content=payload.content,
        creator_profile=payload.creator_profile,
        target_channel=payload.target_channel,
        proposed_spend_amount=payload.proposed_spend_amount,
        prompt=payload.prompt,
        language=payload.language,
        tags=payload.tags,
        comparison_contents=payload.comparison_contents,
        market_context=payload.market_context,
        story_promotion_count_30d=payload.story_promotion_count_30d,
        creator_chargebacks_365d=payload.creator_chargebacks_365d,
        average_story_spend_90d=payload.average_story_spend_90d,
    )
    return CreatorPromotionRiskResponse(**result)
