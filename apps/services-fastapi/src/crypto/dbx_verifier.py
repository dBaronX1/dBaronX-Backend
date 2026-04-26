from __future__ import annotations

from datetime import datetime, timezone
from typing import Any, Iterable, Optional

from crypto.dbx_models import (
    DbxTransferCandidate,
    DbxVerifyPaymentRequest,
    DbxVerifyPaymentResponse,
)
from crypto.solana_rpc import SolanaRpcClient


class DbxPaymentVerifier:
    def __init__(self, *, rpc: Optional[SolanaRpcClient] = None) -> None:
        self.rpc = rpc or SolanaRpcClient()

    async def verify(self, request: DbxVerifyPaymentRequest) -> DbxVerifyPaymentResponse:
        if request.expires_at_datetime() <= datetime.now(timezone.utc):
            return DbxVerifyPaymentResponse.failed(
                signature=request.transactionSignature,
                reason="payment_intent_expired",
            )

        status_payload = await self.rpc.get_signature_status(request.transactionSignature)
        if status_payload is None:
            return DbxVerifyPaymentResponse.failed(
                signature=request.transactionSignature,
                reason="transaction_signature_not_found",
            )

        confirmation_status = str(status_payload.get("confirmationStatus") or "").lower()
        confirmations = status_payload.get("confirmations")
        tx_error = status_payload.get("err")

        if tx_error is not None:
            return DbxVerifyPaymentResponse.failed(
                signature=request.transactionSignature,
                reason="transaction_failed_on_chain",
                raw={"signatureStatus": status_payload},
            )

        if confirmation_status not in {"confirmed", "finalized"}:
            return DbxVerifyPaymentResponse.failed(
                signature=request.transactionSignature,
                reason="transaction_not_confirmed",
                raw={"signatureStatus": status_payload},
            )

        transaction = await self.rpc.get_transaction(request.transactionSignature)
        if transaction is None:
            return DbxVerifyPaymentResponse.failed(
                signature=request.transactionSignature,
                reason="transaction_not_available",
                raw={"signatureStatus": status_payload},
            )

        meta = transaction.get("meta") or {}
        if meta.get("err") is not None:
            return DbxVerifyPaymentResponse.failed(
                signature=request.transactionSignature,
                reason="transaction_meta_failed",
                raw={"signatureStatus": status_payload, "transaction": transaction},
            )

        candidates = list(
            self._extract_transfer_candidates(
                signature=request.transactionSignature,
                transaction=transaction,
                confirmation_status=confirmation_status,
            )
        )

        best_candidate: Optional[DbxTransferCandidate] = None
        expected_amount = int(request.expectedAmountBaseUnits)

        for candidate in candidates:
            if candidate.mint != request.expectedMint:
                continue

            if candidate.receiver != request.expectedTreasuryWallet:
                continue

            if request.expectedSenderWallet and candidate.sender != request.expectedSenderWallet:
                continue

            if not candidate.amountBaseUnits:
                continue

            try:
                candidate_amount = int(candidate.amountBaseUnits)
            except ValueError:
                continue

            if candidate_amount < expected_amount:
                best_candidate = candidate
                continue

            return DbxVerifyPaymentResponse.passed(
                signature=request.transactionSignature,
                mint=candidate.mint,
                receiver=candidate.receiver,
                sender=candidate.sender,
                amount_base_units=candidate.amountBaseUnits,
                confirmations=confirmations if isinstance(confirmations, int) else None,
                slot=transaction.get("slot") if isinstance(transaction.get("slot"), int) else None,
                raw={
                    "signatureStatus": status_payload,
                    "matchedInstruction": candidate.rawInstruction,
                },
            )

        reason = self._failure_reason_from_candidates(
            request=request,
            candidates=candidates,
            best_candidate=best_candidate,
        )

        return DbxVerifyPaymentResponse.failed(
            signature=request.transactionSignature,
            reason=reason,
            raw={
                "signatureStatus": status_payload,
                "candidateCount": len(candidates),
                "transactionSlot": transaction.get("slot"),
            },
            candidate=best_candidate,
        )

    def _extract_transfer_candidates(
        self,
        *,
        signature: str,
        transaction: dict[str, Any],
        confirmation_status: str,
    ) -> Iterable[DbxTransferCandidate]:
        slot = transaction.get("slot")
        tx = transaction.get("transaction") or {}
        message = tx.get("message") or {}

        instructions = list(message.get("instructions") or [])

        meta = transaction.get("meta") or {}
        inner_groups = meta.get("innerInstructions") or []
        for group in inner_groups:
            instructions.extend(group.get("instructions") or [])

        for instruction in instructions:
            parsed = instruction.get("parsed") if isinstance(instruction, dict) else None
            if not isinstance(parsed, dict):
                continue

            instruction_type = str(parsed.get("type") or "")
            info = parsed.get("info") or {}
            if not isinstance(info, dict):
                continue

            candidate = self._candidate_from_parsed_instruction(
                signature=signature,
                instruction_type=instruction_type,
                info=info,
                raw_instruction=instruction,
                slot=slot if isinstance(slot, int) else None,
                confirmation_status=confirmation_status,
            )

            if candidate:
                yield candidate

    def _candidate_from_parsed_instruction(
        self,
        *,
        signature: str,
        instruction_type: str,
        info: dict[str, Any],
        raw_instruction: dict[str, Any],
        slot: Optional[int],
        confirmation_status: str,
    ) -> Optional[DbxTransferCandidate]:
        normalized_type = instruction_type.strip()

        if normalized_type == "transferChecked":
            token_amount = info.get("tokenAmount") or {}
            amount = token_amount.get("amount")
            decimals = token_amount.get("decimals")

            return DbxTransferCandidate(
                signature=signature,
                mint=self._clean(info.get("mint")),
                sender=self._clean(info.get("source")) or self._clean(info.get("authority")),
                receiver=self._clean(info.get("destination")),
                amountBaseUnits=self._clean(amount),
                decimals=decimals if isinstance(decimals, int) else None,
                slot=slot,
                confirmationStatus=confirmation_status,
                err=None,
                instructionType=normalized_type,
                rawInstruction=raw_instruction,
            )

        if normalized_type == "transfer":
            amount = info.get("amount")

            return DbxTransferCandidate(
                signature=signature,
                mint=self._clean(info.get("mint")),
                sender=self._clean(info.get("source")) or self._clean(info.get("authority")),
                receiver=self._clean(info.get("destination")),
                amountBaseUnits=self._clean(amount),
                decimals=None,
                slot=slot,
                confirmationStatus=confirmation_status,
                err=None,
                instructionType=normalized_type,
                rawInstruction=raw_instruction,
            )

        return None

    def _failure_reason_from_candidates(
        self,
        *,
        request: DbxVerifyPaymentRequest,
        candidates: list[DbxTransferCandidate],
        best_candidate: Optional[DbxTransferCandidate],
    ) -> str:
        if not candidates:
            return "no_spl_token_transfer_found"

        mint_matches = [item for item in candidates if item.mint == request.expectedMint]
        if not mint_matches:
            return "dbx_mint_not_found_in_transaction"

        receiver_matches = [
            item for item in mint_matches if item.receiver == request.expectedTreasuryWallet
        ]
        if not receiver_matches:
            return "treasury_wallet_not_found_in_transaction"

        if request.expectedSenderWallet:
            sender_matches = [
                item for item in receiver_matches if item.sender == request.expectedSenderWallet
            ]
            if not sender_matches:
                return "sender_wallet_mismatch"

        if best_candidate:
            return "dbx_amount_below_expected"

        return "dbx_payment_verification_failed"

    def _clean(self, value: Any) -> Optional[str]:
        if value is None:
            return None
        cleaned = str(value).strip()
        return cleaned or None
