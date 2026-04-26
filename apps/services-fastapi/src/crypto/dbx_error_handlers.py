from __future__ import annotations

from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse

from crypto.audit.dbx_audit_logger import DbxAuditLogger
from crypto.errors.dbx_errors import DbxVerificationError


def register_dbx_error_handlers(app: FastAPI) -> None:
    @app.exception_handler(DbxVerificationError)
    async def handle_dbx_verification_error(
        request: Request,
        exc: DbxVerificationError,
    ) -> JSONResponse:
        request_id = getattr(request.state, "request_id", "") or request.headers.get("x-request-id", "")
        service_name = request.headers.get("x-service-name", "unknown-service")

        payload = await request.json() if request.method.upper() == "POST" else {}

        DbxAuditLogger().failed(
            reference=str(payload.get("intentReference", "")),
            signature=str(payload.get("transactionSignature", "")),
            request_id=request_id,
            service_name=service_name,
            reason=exc.code,
            details=exc.details,
        )

        return JSONResponse(
            status_code=200,
            content={
                "success": True,
                "verified": False,
                "status": "failed",
                "reason": exc.code,
                "signature": str(payload.get("transactionSignature", "")),
                "raw": {
                    "requestId": request_id,
                    "error": exc.to_dict(),
                },
            },
        )