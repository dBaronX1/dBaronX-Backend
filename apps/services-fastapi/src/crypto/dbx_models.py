from __future__ import annotations

from datetime import datetime, timezone
from typing import Any, Literal, Optional

from pydantic import BaseModel, Field, validator


class DbxVerifyPaymentRequest(BaseModel):
    intentReference: str = Field(..., min_length=3, max_length=128)
    transactionSignature: str = Field(..., min_length=32, max_length=128)
    expectedMint: str = Field(..., min_length=32, max_length=64)
    expectedTreasuryWallet: str = Field(..., min_length=32, max_length=64)
    expectedAmountBaseUnits: str = Field(..., min_length=1, max_length=80)
    expectedSenderWallet: Optional[str] = Field(default=None, min_length=32, max_length=64)
    expiresAt: str = Field(..., min_length=10, max_length=64)

    @validator("intentReference", "transactionSignature", "expectedMint", "expectedTreasuryWallet")
    def strip_required(cls, value: str) -> str:
        cleaned = str(value or "").strip()
        if not cleaned:
            raise ValueError("field cannot be empty")
        return cleaned

    @validator("expectedSenderWallet")
    def strip_optional(cls, value: Optional[str]) -> Optional[str]:
        if value is None:
            return None
        cleaned = value.strip()
        return cleaned or None

    @validator("expectedAmountBaseUnits")
    def validate_base_units(cls, value: str) -> str:
        cleaned = str(value or "").strip()
        if not cleaned.isdigit():
            raise ValueError("expectedAmountBaseUnits must be a positive integer string")
        if int(cleaned) <= 0:
            raise ValueError("expectedAmountBaseUnits must be greater than zero")
        return cleaned

    def expires_at_datetime(self) -> datetime:
        raw = self.expiresAt.replace("Z", "+00:00")
        parsed = datetime.fromisoformat(raw)
        if parsed.tzinfo is None:
            parsed = parsed.replace(tzinfo=timezone.utc)
        return parsed.astimezone(timezone.utc)


class DbxTransferCandidate(BaseModel):
    signature: str
    mint: Optional[str] = None
    sender: Optional[str] = None
    receiver: Optional[str] = None
    amountBaseUnits: Optional[str] = None
    decimals: Optional[int] = None
    slot: Optional[int] = None
    confirmationStatus: Optional[str] = None
    err: Optional[Any] = None
    instructionType: Optional[str] = None
    rawInstruction: dict[str, Any] = Field(default_factory=dict)


class DbxVerifyPaymentResponse(BaseModel):
    success: bool = True
    verified: bool
    status: Literal["passed", "failed"]
    reason: Optional[str] = None
    signature: str
    mint: Optional[str] = None
    receiver: Optional[str] = None
    sender: Optional[str] = None
    amountBaseUnits: Optional[str] = None
    confirmations: Optional[int] = None
    slot: Optional[int] = None
    raw: dict[str, Any] = Field(default_factory=dict)

    @classmethod
    def passed(
        cls,
        *,
        signature: str,
        mint: str,
        receiver: str,
        sender: Optional[str],
        amount_base_units: str,
        confirmations: Optional[int],
        slot: Optional[int],
        raw: dict[str, Any],
    ) -> "DbxVerifyPaymentResponse":
        return cls(
            verified=True,
            status="passed",
            reason=None,
            signature=signature,
            mint=mint,
            receiver=receiver,
            sender=sender,
            amountBaseUnits=amount_base_units,
            confirmations=confirmations,
            slot=slot,
            raw=raw,
        )

    @classmethod
    def failed(
        cls,
        *,
        signature: str,
        reason: str,
        raw: Optional[dict[str, Any]] = None,
        candidate: Optional[DbxTransferCandidate] = None,
    ) -> "DbxVerifyPaymentResponse":
        return cls(
            verified=False,
            status="failed",
            reason=reason,
            signature=signature,
            mint=candidate.mint if candidate else None,
            receiver=candidate.receiver if candidate else None,
            sender=candidate.sender if candidate else None,
            amountBaseUnits=candidate.amountBaseUnits if candidate else None,
            slot=candidate.slot if candidate else None,
            raw=raw or {},
        )
