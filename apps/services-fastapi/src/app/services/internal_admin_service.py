from __future__ import annotations

from app.schemas.common import PaginationMeta
from app.schemas.internal_admin import (
    ManualBlockRequest,
    ManualReviewDecisionRequest,
    RiskEventSearchRequest,
)
from app.services.redis_service import RedisService
from app.services.supabase_service import SupabaseService


class InternalAdminService:
    def __init__(
        self,
        *,
        redis: RedisService,
        supabase: SupabaseService,
    ) -> None:
        self.redis = redis
        self.supabase = supabase

    async def search_risk_events(self, request: RiskEventSearchRequest) -> dict:
        rows, total = await self.supabase.search_risk_events(
            filters={
                "event_type": request.event_type,
                "decision": request.decision,
                "user_id": request.user_id,
                "ip": request.ip,
                "min_score": request.min_score,
                "max_score": request.max_score,
            },
            limit=request.limit,
            offset=request.offset,
        )

        return {
            "success": True,
            "events": rows,
            "pagination": PaginationMeta.build(
                page=request.page,
                limit=request.limit,
                total=total,
            ).model_dump(),
        }

    async def create_manual_block(self, request: ManualBlockRequest) -> dict:
        block_key = f"manual:block:{request.target_key}"
        payload = {
            "block_type": request.block_type,
            "reason": request.reason,
            "actor_id": request.actor_id,
            "metadata": request.metadata,
        }

        await self.redis.set_json(
            block_key,
            payload,
            ttl_seconds=request.ttl_seconds,
        )

        await self.supabase.insert_admin_action(
            {
                "action_type": "manual_block_created",
                "actor_id": request.actor_id,
                "target_key": request.target_key,
                "metadata": payload,
            }
        )

        return {
            "success": True,
            "block": {
                "key": block_key,
                "ttl_seconds": request.ttl_seconds,
                "payload": payload,
            },
        }

    async def submit_manual_review_decision(
        self,
        request: ManualReviewDecisionRequest,
    ) -> dict:
        payload = {
            "review_id": request.review_id,
            "decision": request.decision,
            "reason": request.reason,
            "actor_id": request.actor_id,
            "metadata": request.metadata,
        }

        await self.supabase.insert_admin_action(
            {
                "action_type": "manual_review_decision",
                "actor_id": request.actor_id,
                "target_key": request.review_id,
                "metadata": payload,
            }
        )

        return {
            "success": True,
            "review": payload,
        }
