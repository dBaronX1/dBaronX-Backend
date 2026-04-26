from __future__ import annotations

from typing import Any, Optional


class DbxVerificationError(Exception):
    code = "dbx_verification_error"

    def __init__(
        self,
        message: str,
        *,
        code: Optional[str] = None,
        details: Optional[dict[str, Any]] = None,
    ) -> None:
        super().__init__(message)
        self.message = message
        self.code = code or self.code
        self.details = details or {}

    def to_dict(self) -> dict[str, Any]:
        return {
            "code": self.code,
            "message": self.message,
            "details": self.details,
        }


class DbxInvalidInputError(DbxVerificationError):
    code = "dbx_invalid_input"


class DbxRpcError(DbxVerificationError):
    code = "dbx_rpc_error"


class DbxTransactionNotFoundError(DbxVerificationError):
    code = "dbx_transaction_not_found"


class DbxTransactionFailedError(DbxVerificationError):
    code = "dbx_transaction_failed"


class DbxTransactionUnconfirmedError(DbxVerificationError):
    code = "dbx_transaction_unconfirmed"


class DbxTransferNotFoundError(DbxVerificationError):
    code = "dbx_transfer_not_found"


class DbxTransferMismatchError(DbxVerificationError):
    code = "dbx_transfer_mismatch"


class DbxExpiredIntentError(DbxVerificationError):
    code = "dbx_payment_intent_expired"