from __future__ import annotations

from fastapi import APIRouter, Depends

from app.schemas.telemetry_integrity import (
    TelemetryIntegrityRequest,
    TelemetryIntegrityResponse,
)
from app.services.telemetry_integrity_service import TelemetryIntegrityService

router = APIRouter(prefix="/telemetry-integrity", tags=["telemetry-integrity"])


def telemetry_integrity_service_dep() -> TelemetryIntegrityService:
    return TelemetryIntegrityService()


@router.post("/watch/evaluate", response_model=TelemetryIntegrityResponse)
async def evaluate_watch_telemetry_integrity(
    payload: TelemetryIntegrityRequest,
    service: TelemetryIntegrityService = Depends(
        telemetry_integrity_service_dep
    ),
):
    result = service.evaluate_watch_integrity(
        session_id=payload.session_id,
        headers=payload.headers,
        ip=payload.ip,
        account_id=payload.account_id,
        declared_duration_seconds=payload.declared_duration_seconds,
        heartbeat_intervals_ms=payload.heartbeat_intervals_ms,
        total_heartbeats=payload.total_heartbeats,
        hidden_event_count=payload.hidden_event_count,
        blur_event_count=payload.blur_event_count,
        seek_event_count=payload.seek_event_count,
        playback_rate_max=payload.playback_rate_max,
        muted_ratio=payload.muted_ratio,
        duplicate_claim_attempts=payload.duplicate_claim_attempts,
        recent_ip_events=payload.recent_ip_events,
        distinct_accounts_24h=payload.distinct_accounts_24h,
        failed_captcha_1h=payload.failed_captcha_1h,
        denied_watch_claims_24h=payload.denied_watch_claims_24h,
    )
    return TelemetryIntegrityResponse(**result)
