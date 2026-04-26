from __future__ import annotations

from typing import Any

from apps.services_fastapi.src.modules.watch.schemas.session_validation_contracts import (
    SessionAnomalyReport,
    ValidationDecision,
    WatchSessionAggregate,
)


class WatchDecisionExplainer:
    """
    Produces concise but deterministic machine-readable reasons
    for why a session was approved, challenged, or rejected.
    """

    def explain(
        self,
        aggregate: WatchSessionAggregate,
        anomaly_report: SessionAnomalyReport,
        decision: ValidationDecision,
    ) -> dict[str, Any]:
        strongest_signals = sorted(
            anomaly_report.signals,
            key=lambda signal: (signal.score_delta, signal.severity),
            reverse=True,
        )[:5]

        return {
            "session_id": aggregate.session_id,
            "user_id": aggregate.user_id,
            "decision": decision.status,
            "risk_level": decision.risk_level,
            "score": decision.score,
            "requires_captcha": decision.requires_captcha,
            "requires_manual_review": decision.requires_manual_review,
            "primary_reasons": [
                {
                    "code": signal.code,
                    "label": signal.label,
                    "severity": signal.severity,
                    "score_delta": signal.score_delta,
                }
                for signal in strongest_signals
            ],
            "derived_metrics": anomaly_report.derived_metrics,
            "telemetry_summary": {
                "heartbeat_count": aggregate.heartbeat_count,
                "session_duration_ms": aggregate.session_duration_ms,
                "focus_loss_count": aggregate.focus_loss_count,
                "visibility_hidden_count": aggregate.visibility_hidden_count,
                "playback_rate_max": aggregate.playback_rate_max,
                "playback_rate_min": aggregate.playback_rate_min,
                "average_volume": aggregate.average_volume,
                "completion_ratio": aggregate.completion_ratio,
            },
        }
