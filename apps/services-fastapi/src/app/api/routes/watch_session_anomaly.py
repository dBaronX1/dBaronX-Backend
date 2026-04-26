from __future__ import annotations

from fastapi import APIRouter, Depends

from app.schemas.watch_session_anomaly import (
    WatchSessionAnomalyRequest,
    WatchSessionAnomalyResponse,
)
from app.services.watch_session_anomaly_service import WatchSessionAnomalyService

router = APIRouter(prefix="/watch-session-anomaly", tags=["watch-session-anomaly"])


def watch_session_anomaly_service_dep() -> WatchSessionAnomalyService:
    return WatchSessionAnomalyService()


@router.post("/evaluate", response_model=WatchSessionAnomalyResponse)
async def evaluate_watch_session_anomaly(
    payload: WatchSessionAnomalyRequest,
    service: WatchSessionAnomalyService = Depends(
        watch_session_anomaly_service_dep
    ),
):
    result = service.evaluate(
        session_id=payload.session_id,
        declared_duration_seconds=payload.declared_duration_seconds,
        heartbeat_intervals_ms=payload.heartbeat_intervals_ms,
        total_heartbeats=payload.total_heartbeats,
        hidden_event_count=payload.hidden_event_count,
        blur_event_count=payload.blur_event_count,
        seek_event_count=payload.seek_event_count,
        playback_rate_max=payload.playback_rate_max,
        muted_ratio=payload.muted_ratio,
        duplicate_claim_attempts=payload.duplicate_claim_attempts,
    )
    return WatchSessionAnomalyResponse(**result)
