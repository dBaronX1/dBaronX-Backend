from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends, Request

from crypto.audit.dbx_audit_logger import DbxAuditLogger
from crypto.dbx_models import DbxVerifyPaymentRequest, DbxVerifyPaymentResponse
from crypto.dbx_observability import observe_duration
from crypto.dependencies.dbx_dependencies import (
    InternalAuthDependency,
    get_instruction_parser,
    get_policy,
    get_status_reader,
    get_transaction_reader,
    get_transfer_matcher,
    request_id,
    service_name,
)
from crypto.policies.dbx_verification_policy import DbxVerificationPolicy
from crypto.schemas.dbx_route_schemas import DbxVerificationTraceResponse
from crypto.services.dbx_instruction_parser import DbxInstructionParser
from crypto.services.dbx_status_reader import DbxStatusReader
from crypto.services.dbx_transaction_reader import DbxTransactionReader
from crypto.services.dbx_transfer_matcher import (
    DbxTransferMatcher,
    DbxTransferMatchRequest,
)

router = APIRouter(prefix="/internal/dbx", tags=["internal-dbx-v2"])


@router.post(
    "/verify-payment-v2",
    response_model=DbxVerifyPaymentResponse,
    summary="Verify DBX SPL-token transfer with hardened route pipeline",
)
async def verify_dbx_payment_v2(
    payload: DbxVerifyPaymentRequest,
    request: Request,
    _auth: InternalAuthDependency,
    policy: Annotated[DbxVerificationPolicy, Depends(get_policy)],
    status_reader: Annotated[DbxStatusReader, Depends(get_status_reader)],
    transaction_reader: Annotated[DbxTransactionReader, Depends(get_transaction_reader)],
    instruction_parser: Annotated[DbxInstructionParser, Depends(get_instruction_parser)],
    transfer_matcher: Annotated[DbxTransferMatcher, Depends(get_transfer_matcher)],
    rid: Annotated[str, Depends(request_id)],
    caller: Annotated[str, Depends(service_name)],
) -> DbxVerifyPaymentResponse:
    audit = DbxAuditLogger()

    with observe_duration(
        "dbx.verify_payment_v2",
        reference=payload.intentReference,
        signature=payload.transactionSignature,
    ):
        audit.requested(
            reference=payload.intentReference,
            signature=payload.transactionSignature,
            request_id=rid,
            service_name=caller,
        )

        policy.assert_request_shape(
            signature=payload.transactionSignature,
            expected_mint=payload.expectedMint,
            expected_treasury_wallet=payload.expectedTreasuryWallet,
            expected_amount_base_units=payload.expectedAmountBaseUnits,
            expected_sender_wallet=payload.expectedSenderWallet,
            expires_at=payload.expiresAt,
        )

        signature_status = await status_reader.read_required(payload.transactionSignature)
        policy.assert_signature_status(signature_status)

        transaction = await transaction_reader.read_required(payload.transactionSignature)
        policy.assert_transaction_meta(transaction)

        confirmation_status = str(signature_status.get("confirmationStatus") or "").lower()

        candidates = instruction_parser.extract_transfer_candidates(
            signature=payload.transactionSignature,
            transaction=transaction,
            confirmation_status=confirmation_status,
        )

        match = transfer_matcher.match_required(
            candidates=candidates,
            request=DbxTransferMatchRequest(
                expected_mint=payload.expectedMint,
                expected_treasury_wallet=payload.expectedTreasuryWallet,
                expected_amount_base_units=payload.expectedAmountBaseUnits,
                expected_sender_wallet=payload.expectedSenderWallet,
            ),
        )

        audit.succeeded(
            reference=payload.intentReference,
            signature=payload.transactionSignature,
            request_id=rid,
            service_name=caller,
            amount_base_units=match.candidate.amountBaseUnits or "",
        )

        return DbxVerifyPaymentResponse.passed(
            signature=payload.transactionSignature,
            mint=match.candidate.mint or payload.expectedMint,
            receiver=match.candidate.receiver or payload.expectedTreasuryWallet,
            sender=match.candidate.sender,
            amount_base_units=match.candidate.amountBaseUnits or "0",
            confirmations=signature_status.get("confirmations")
            if isinstance(signature_status.get("confirmations"), int)
            else None,
            slot=transaction.get("slot") if isinstance(transaction.get("slot"), int) else None,
            raw={
                "requestId": rid,
                "serviceName": caller,
                "confirmationStatus": confirmation_status,
                "matchedInstruction": match.candidate.rawInstruction,
            },
        )


@router.post(
    "/verify-payment-trace",
    response_model=DbxVerificationTraceResponse,
    summary="Trace DBX transaction verification without completing payment",
)
async def trace_dbx_payment(
    payload: DbxVerifyPaymentRequest,
    request: Request,
    _auth: InternalAuthDependency,
    policy: Annotated[DbxVerificationPolicy, Depends(get_policy)],
    status_reader: Annotated[DbxStatusReader, Depends(get_status_reader)],
    transaction_reader: Annotated[DbxTransactionReader, Depends(get_transaction_reader)],
    instruction_parser: Annotated[DbxInstructionParser, Depends(get_instruction_parser)],
    rid: Annotated[str, Depends(request_id)],
) -> DbxVerificationTraceResponse:
    policy.assert_request_shape(
        signature=payload.transactionSignature,
        expected_mint=payload.expectedMint,
        expected_treasury_wallet=payload.expectedTreasuryWallet,
        expected_amount_base_units=payload.expectedAmountBaseUnits,
        expected_sender_wallet=payload.expectedSenderWallet,
        expires_at=payload.expiresAt,
    )

    status_payload = await status_reader.read_optional(payload.transactionSignature)
    transaction = await transaction_reader.read_optional(payload.transactionSignature)

    candidates = []
    if transaction:
        candidates = instruction_parser.extract_transfer_candidates(
            signature=payload.transactionSignature,
            transaction=transaction,
            confirmation_status=str((status_payload or {}).get("confirmationStatus") or ""),
        )

    return DbxVerificationTraceResponse(
        success=True,
        requestId=rid,
        reference=payload.intentReference,
        signature=payload.transactionSignature,
        statusFound=status_payload is not None,
        transactionFound=transaction is not None,
        candidateCount=len(candidates),
        candidates=[candidate.dict() for candidate in candidates],
        status=status_payload or {},
    )