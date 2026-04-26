from __future__ import annotations

from pydantic import BaseModel


class StoryPromotionReadinessResponse(BaseModel):
    success: bool
    story_promotion_readiness: dict
