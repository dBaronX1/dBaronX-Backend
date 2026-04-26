from __future__ import annotations

SERVICE_NAME = "dbaronx-fastapi"
SERVICE_LAYER = "intelligence"

REQUEST_ID_HEADER = "x-request-id"
INTERNAL_TOKEN_HEADER = "authorization"

DEFAULT_TIMEOUT_SECONDS = 20.0
DEFAULT_HEALTH_TABLE = "health_check"

RISK_DECISION_ALLOW = "allow"
RISK_DECISION_REVIEW = "review"
RISK_DECISION_BLOCK = "block"

W2E_EVENT_TYPES = {
    "session_started",
    "heartbeat",
    "visibility_change",
    "focus_change",
    "playback_change",
    "mute_change",
    "session_completed",
    "claim_attempted",
}

SUPPORTED_AI_PROVIDERS = (
    "anthropic",
    "openai",
    "gemini",
)

PUBLIC_HEALTH_PATHS = frozenset(
    {
        "/",
        "/health",
        "/health/live",
        "/health/ready",
    }
)
