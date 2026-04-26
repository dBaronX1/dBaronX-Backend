from __future__ import annotations

from typing import Any, Optional

from crypto.errors.dbx_errors import DbxTransactionNotFoundError
from crypto.solana_rpc import SolanaRpcClient


class DbxStatusReader:
    def __init__(self, rpc: Optional[SolanaRpcClient] = None) -> None:
        self.rpc = rpc or SolanaRpcClient()

    async def read_required(self, signature: str) -> dict[str, Any]:
        status = await self.rpc.get_signature_status(signature)

        if status is None:
            raise DbxTransactionNotFoundError(
                "Solana transaction signature was not found",
                details={"signature": signature},
            )

        return status

    async def read_optional(self, signature: str) -> dict[str, Any] | None:
        return await self.rpc.get_signature_status(signature)