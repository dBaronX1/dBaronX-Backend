from __future__ import annotations

from typing import Literal

from pydantic import BaseModel


class DbxDiagnosticsResponse(BaseModel):
    success: bool
    environment: Literal["development", "test", "staging", "production"]
    rpcConfigured: bool
    internalTokenConfigured: bool
    mintAddress: str
    decimals: int
    treasuryConfigured: bool
    requireFinalized: bool
    featureFlags: dict[str, bool]