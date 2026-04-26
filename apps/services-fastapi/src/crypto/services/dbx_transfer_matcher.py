from __future__ import annotations

from dataclasses import dataclass
from typing import Optional

from crypto.dbx_models import DbxTransferCandidate
from crypto.errors.dbx_errors import DbxTransferMismatchError, DbxTransferNotFoundError


@dataclass(frozen=True)
class DbxTransferMatchRequest:
    expected_mint: str
    expected_treasury_wallet: str
    expected_amount_base_units: str
    expected_sender_wallet: Optional[str] = None


@dataclass(frozen=True)
class DbxTransferMatchResult:
    candidate: DbxTransferCandidate
    amount_ok: bool
    mint_ok: bool
    receiver_ok: bool
    sender_ok: bool


class DbxTransferMatcher:
    def match_required(
        self,
        *,
        candidates: list[DbxTransferCandidate],
        request: DbxTransferMatchRequest,
    ) -> DbxTransferMatchResult:
        if not candidates:
            raise DbxTransferNotFoundError(
                "No SPL token transfer instruction was found in transaction",
                code="no_spl_token_transfer_found",
            )

        best_candidate: Optional[DbxTransferCandidate] = None
        expected_amount = int(request.expected_amount_base_units)

        for candidate in candidates:
            mint_ok = candidate.mint == request.expected_mint
            receiver_ok = candidate.receiver == request.expected_treasury_wallet
            sender_ok = (
                True
                if not request.expected_sender_wallet
                else candidate.sender == request.expected_sender_wallet
            )

            amount_ok = False
            if candidate.amountBaseUnits and candidate.amountBaseUnits.isdigit():
                amount_ok = int(candidate.amountBaseUnits) >= expected_amount

            if mint_ok and receiver_ok and sender_ok:
                best_candidate = candidate

                if amount_ok:
                    return DbxTransferMatchResult(
                        candidate=candidate,
                        amount_ok=True,
                        mint_ok=True,
                        receiver_ok=True,
                        sender_ok=True,
                    )

        raise DbxTransferMismatchError(
            self._reason(
                candidates=candidates,
                request=request,
                best_candidate=best_candidate,
            ),
            details={
                "candidateCount": len(candidates),
                "bestCandidate": best_candidate.dict() if best_candidate else None,
            },
        )

    def _reason(
        self,
        *,
        candidates: list[DbxTransferCandidate],
        request: DbxTransferMatchRequest,
        best_candidate: Optional[DbxTransferCandidate],
    ) -> str:
        mint_matches = [item for item in candidates if item.mint == request.expected_mint]
        if not mint_matches:
            return "dbx_mint_not_found_in_transaction"

        receiver_matches = [
            item for item in mint_matches if item.receiver == request.expected_treasury_wallet
        ]
        if not receiver_matches:
            return "treasury_wallet_not_found_in_transaction"

        if request.expected_sender_wallet:
            sender_matches = [
                item for item in receiver_matches if item.sender == request.expected_sender_wallet
            ]
            if not sender_matches:
                return "sender_wallet_mismatch"

        if best_candidate:
            return "dbx_amount_below_expected"

        return "dbx_payment_transfer_mismatch"