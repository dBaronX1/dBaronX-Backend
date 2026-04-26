from __future__ import annotations

from fastapi import APIRouter, Depends

from app.schemas.story_discovery_ranking import (
    StoryDiscoveryRankingRequest,
    StoryDiscoveryRankingResponse,
)
from app.services.story_discovery_ranking_service import StoryDiscoveryRankingService

router = APIRouter(
    prefix="/story-discovery-ranking",
    tags=["story-discovery-ranking"],
)


def story_discovery_ranking_service_dep() -> StoryDiscoveryRankingService:
    return StoryDiscoveryRankingService()


@router.post("/rank", response_model=StoryDiscoveryRankingResponse)
async def rank_story_candidates(
    payload: StoryDiscoveryRankingRequest,
    service: StoryDiscoveryRankingService = Depends(story_discovery_ranking_service_dep),
):
    ranked = service.rank(payload.candidates)
    return StoryDiscoveryRankingResponse(success=True, ranked=ranked)
