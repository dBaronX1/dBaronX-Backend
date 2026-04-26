from __future__ import annotations

from pydantic import BaseModel


class RouterMountVerificationResponse(BaseModel):
    success: bool
    router_mount_verification: dict
