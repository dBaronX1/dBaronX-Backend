from __future__ import annotations

from typing import Any, Protocol

from crypto.dbx_models import DbxTransferCandidate


class SolanaRpcContract(Protocol):
    async def get_signature_status(self, signature: str) -> dict[str, Any] | None:
        ...

    async def get_transaction(self, signature: str) -> dict[str, Any] | None:
        ...


class DbxInstructionParserContract(Protocol):
    def extract_transfer_candidates(
        self,
        *,
        signature: str,
        transaction: dict[str, Any],
        confirmation_status: str,
    ) -> list[DbxTransferCandidate]:
        ...


class DbxHealthContract(Protocol):
    async def health(self) -> dict[str, Any]:
        ...