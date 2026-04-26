from __future__ import annotations

from dataclasses import dataclass
from typing import Any


@dataclass(slots=True)
class ScoreBreakdown:
    score: float
    level: str
    reason: str
    signals: dict[str, Any]


class RiskScoringService:
    """
    Canonical weighted scoring engine for the intelligence layer.

    Design rules:
    - same scoring contract across checkout / affiliate / watch
    - stable and explainable reasons
    - bounded score 0..1
    """

    def _finalize(
        self,
        *,
        score: float,
        reasons: list[str],
        signals: dict[str, Any],
    ) -> ScoreBreakdown:
        bounded = max(0.0, min(1.0, round(score, 4)))

        if bounded >= 0.85:
            level = "critical"
        elif bounded >= 0.65:
            level = "high"
        elif bounded >= 0.35:
            level = "medium"
        else:
            level = "low"

        reason = "; ".join(reasons) if reasons else "no material risk signals triggered"

        return ScoreBreakdown(
            score=bounded,
            level=level,
            reason=reason,
            signals=signals,
        )

    def score_checkout(
        self,
        *,
        amount: float,
        suspicious_user_agent: bool,
        velocity_exceeded: bool,
        duplicate_ip_cluster: bool,
        email_domain_risky: bool,
        guest_checkout: bool,
    ) -> ScoreBreakdown:
        score = 0.0
        reasons: list[str] = []
        signals = {
            "amount": amount,
            "suspicious_user_agent": suspicious_user_agent,
            "velocity_exceeded": velocity_exceeded,
            "duplicate_ip_cluster": duplicate_ip_cluster,
            "email_domain_risky": email_domain_risky,
            "guest_checkout": guest_checkout,
        }

        if amount >= 1000:
            score += 0.18
            reasons.append("high checkout amount")

        if suspicious_user_agent:
            score += 0.26
            reasons.append("suspicious user agent")

        if velocity_exceeded:
            score += 0.28
            reasons.append("request velocity exceeded")

        if duplicate_ip_cluster:
            score += 0.17
            reasons.append("ip cluster density elevated")

        if email_domain_risky:
            score += 0.14
            reasons.append("email domain risk elevated")

        if guest_checkout:
            score += 0.06
            reasons.append("guest checkout path")

        return self._finalize(score=score, reasons=reasons, signals=signals)

    def score_affiliate(
        self,
        *,
        suspicious_user_agent: bool,
        velocity_exceeded: bool,
        duplicate_ip_cluster: bool,
        referral_code_present: bool,
        amount: float | None,
    ) -> ScoreBreakdown:
        score = 0.0
        reasons: list[str] = []
        signals = {
            "suspicious_user_agent": suspicious_user_agent,
            "velocity_exceeded": velocity_exceeded,
            "duplicate_ip_cluster": duplicate_ip_cluster,
            "referral_code_present": referral_code_present,
            "amount": amount,
        }

        if suspicious_user_agent:
            score += 0.30
            reasons.append("suspicious user agent")

        if velocity_exceeded:
            score += 0.32
            reasons.append("affiliate velocity exceeded")

        if duplicate_ip_cluster:
            score += 0.20
            reasons.append("shared ip cluster elevated")

        if referral_code_present:
            score += 0.04
            reasons.append("tracked referral path")

        if amount is not None and amount > 500:
            score += 0.08
            reasons.append("high affiliate value event")

        return self._finalize(score=score, reasons=reasons, signals=signals)

    def score_watch(
        self,
        *,
        suspicious_user_agent: bool,
        velocity_exceeded: bool,
        duplicate_ip_cluster: bool,
        insufficient_visible_heartbeats: bool,
        hidden_heartbeat_dominance: bool,
        high_playback_rate: bool,
        repeated_fingerprint: bool,
        captcha_verified: bool,
        duration_seconds: int,
        minimum_required_seconds: int,
    ) -> ScoreBreakdown:
        score = 0.0
        reasons: list[str] = []
        signals = {
            "suspicious_user_agent": suspicious_user_agent,
            "velocity_exceeded": velocity_exceeded,
            "duplicate_ip_cluster": duplicate_ip_cluster,
            "insufficient_visible_heartbeats": insufficient_visible_heartbeats,
            "hidden_heartbeat_dominance": hidden_heartbeat_dominance,
            "high_playback_rate": high_playback_rate,
            "repeated_fingerprint": repeated_fingerprint,
            "captcha_verified": captcha_verified,
            "duration_seconds": duration_seconds,
            "minimum_required_seconds": minimum_required_seconds,
        }

        if duration_seconds < minimum_required_seconds:
            score += 0.50
            reasons.append("minimum watch duration not met")

        if insufficient_visible_heartbeats:
            score += 0.22
            reasons.append("visible heartbeat coverage too low")

        if hidden_heartbeat_dominance:
            score += 0.16
            reasons.append("hidden heartbeat dominance detected")

        if high_playback_rate:
            score += 0.18
            reasons.append("playback rate too high")

        if repeated_fingerprint:
            score += 0.18
            reasons.append("fingerprint repetition elevated")

        if suspicious_user_agent:
            score += 0.16
            reasons.append("suspicious user agent")

        if velocity_exceeded:
            score += 0.18
            reasons.append("watch velocity exceeded")

        if duplicate_ip_cluster:
            score += 0.12
            reasons.append("ip cluster elevated")

        if not captcha_verified:
            score += 0.10
            reasons.append("captcha not verified")

        return self._finalize(score=score, reasons=reasons, signals=signals)
