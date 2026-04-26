from __future__ import annotations

from pydantic import BaseModel, Field, field_validator


class DeviceFingerprintRequest(BaseModel):
    headers: dict = Field(...)
    ip: str | None = Field(default=None, max_length=100)
    account_id: str | None = Field(default=None, max_length=120)
    fingerprint_seed: str | None = Field(default=None, max_length=500)

    @field_validator("ip", "account_id", "fingerprint_seed")
    @classmethod
    def normalize_optional_text(cls, value: str | None) -> str | None:
        if value is None:
            return None
        cleaned = value.strip()
        return cleaned or None


class DeviceFingerprintResponse(BaseModel):
    success: bool
    fingerprint: dict
