from __future__ import annotations

from pydantic import Field, field_validator

from app.schemas.common import DBXModel


class CaptchaVerifyRequest(DBXModel):
    token: str = Field(min_length=5, max_length=10000)
    action: str | None = Field(default=None, min_length=1, max_length=100)
    risk_level: str | None = Field(default=None, min_length=3, max_length=20)
    ip: str | None = Field(default=None, min_length=2, max_length=128)

    @field_validator("token")
    @classmethod
    def normalize_token(cls, value: str) -> str:
        normalized = value.strip()
        if not normalized:
            raise ValueError("token must not be empty")
        return normalized

    @field_validator("action")
    @classmethod
    def normalize_action(cls, value: str | None) -> str | None:
        if value is None:
            return None
        normalized = value.strip().lower()
        return normalized or None

    @field_validator("risk_level")
    @classmethod
    def normalize_risk_level(cls, value: str | None) -> str | None:
        if value is None:
            return None
        normalized = value.strip().lower()
        return normalized or None

    @field_validator("ip")
    @classmethod
    def normalize_ip(cls, value: str | None) -> str | None:
        if value is None:
            return None
        normalized = value.strip()
        return normalized or None


class CaptchaVerifyResponse(DBXModel):
    success: bool
    verified: bool
    passed: bool
    provider: str
    action: str
    risk_level: str
    failure_reason: str | None = None
    score: float | None = None
    reasons: list[str] = Field(default_factory=list)
    attempted_providers: list[str] = Field(default_factory=list)
