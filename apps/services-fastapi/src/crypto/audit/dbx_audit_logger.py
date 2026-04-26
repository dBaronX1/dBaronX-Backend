from __future__ import annotations

from typing import Any

from crypto.dbx_observability import log_event


class DbxAuditLogger:
    def requested(
        self,
        *,
        reference: str,
        signature: str,
        request_id: str,
        service_name: str,
    ) -> None:
        log_event(
            "dbx.verification.requested",
            reference=reference,
            signature=signature,
            requestId=request_id,
            serviceName=service_name,
        )

    def succeeded(
        self,
        *,
        reference: str,
        signature: str,
        request_id: str,
        service_name: str,
        amount_base_units: str,
    ) -> None:
        log_event(
            "dbx.verification.succeeded",
            reference=reference,
            signature=signature,
            requestId=request_id,
            serviceName=service_name,
            amountBaseUnits=amount_base_units,
        )

    def failed(
        self,
        *,
        reference: str,
        signature: str,
        request_id: str,
        service_name: str,
        reason: str,
        details: dict[str, Any] | None = None,
    ) -> None:
        log_event(
            "dbx.verification.failed",
            level="warning",
            reference=reference,
            signature=signature,
            requestId=request_id,
            serviceName=service_name,
            reason=reason,
            details=details or {},
        )