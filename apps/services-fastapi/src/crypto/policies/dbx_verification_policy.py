from __future__ import annotations

from datetime import datetime, timezone
from typing import Optional

from crypto.config.dbx_settings import DbxSettings, get_dbx_settings
from crypto.errors.dbx_errors import (
    DbxExpiredIntentError,
    DbxInvalidInputError,
    DbxTransactionFailedError,
    DbxTransactionUnconfirmedError,
)
from crypto.utils.base58_validator import assert_base58
from crypto.utils.time import parse_iso_datetime


class DbxVerificationPolicy:
    def __init__(self, settings: Optional[DbxSettings] = None) -> None:
        self.settings = settings or get_dbx_settings()

    def assert_request_shape(
        self,
        *,
        signature: str,
        expected_mint: str,
        expected_treasury_wallet: str,
        expected_amount_base_units: str,
        expected_sender_wallet: Optional[str],
        expires_at: str,
    ) -> None:
        assert_base58(signature, field_name="transactionSignature", min_len=64, max_len=128)
        assert_base58(expected_mint, field_name="expectedMint", min_len=32, max_len=44)
        assert_base58(
            expected_treasury_wallet,
            field_name="expectedTreasuryWallet",
            min_len=32,
            max_len=44,
        )

        if expected_sender_wallet:
            assert_base58(
                expected_sender_wallet,
                field_name="expectedSenderWallet",
                min_len=32,
                max_len=44,
            )

        if not expected_amount_base_units.isdigit() or int(expected_amount_base_units) <= 0:
            raise DbxInvalidInputError(
                "expectedAmountBaseUnits must be a positive integer string",
                code="invalid_expected_amount",
            )

        parsed_expires_at = parse_iso_datetime(expires_at)
        if parsed_expires_at <= datetime.now(timezone.utc):
            raise DbxExpiredIntentError(
                "DBX payment intent has expired",
                details={"expiresAt": expires_at},
            )

    def assert_signature_status(self, status_payload: dict) -> None:
        if status_payload.get("err") is not None:
            raise DbxTransactionFailedError(
                "Solana transaction failed on-chain",
                details={"err": status_payload.get("err")},
            )

        confirmation_status = str(status_payload.get("confirmationStatus") or "").lower()

        if confirmation_status not in self.settings.confirmation_statuses:
            raise DbxTransactionUnconfirmedError(
                "Solana transaction is not sufficiently confirmed",
                details={
                    "confirmationStatus": confirmation_status,
                    "required": sorted(self.settings.confirmation_statuses),
                },
            )

    def assert_transaction_meta(self, transaction: dict) -> None:
        meta = transaction.get("meta") or {}
        if meta.get("err") is not None:
            raise DbxTransactionFailedError(
                "Solana transaction meta contains an error",
                details={"err": meta.get("err")},
            )