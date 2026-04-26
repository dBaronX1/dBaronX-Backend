from __future__ import annotations

import logging
from typing import Annotated

from fastapi import APIRouter, Depends, Request

from crypto.dbx_models import DbxVerifyPaymentRequest, DbxVerifyPaymentResponse
from crypto.dbx_security import require_internal_service_token
from crypto.dbx_verifier import DbxPaymentVerifier

logger = logging.getLogger("dbaronx.fastapi.crypto.dbx")

router = APIRouter(prefix="/internal/dbx", tags=["internal-dbx"])


def get_dbx_payment_verifier() -> DbxPaymentVerifier:
    return DbxPaymentVerifier()


@router.post(
    "/verify-payment",
    response_model=DbxVerifyPaymentResponse,
    summary="Verify a DBX Solana SPL-token payment",
)
async def verify_dbx_payment(
    payload: DbxVerifyPaymentRequest,
    request: Request,
    _auth: Annotated[dict[str, str], Depends(require_internal_service_token)],
    verifier: Annotated[DbxPaymentVerifier, Depends(get_dbx_payment_verifier)],
) -> DbxVerifyPaymentResponse:
    request_id = request.headers.get("x-request-id", "")

    logger.info(
        "DBX verification requested reference=%s signature=%s request_id=%s",
        payload.intentReference,
        payload.transactionSignature,
        request_id,
    )

    result = await verifier.verify(payload)

    logger.info(
        "DBX verification completed reference=%s signature=%s verified=%s reason=%s request_id=%s",
        payload.intentReference,
        payload.transactionSignature,
        result.verified,
        result.reason,
        request_id,
    )

    return result
