from __future__ import annotations

from typing import Any, Optional

from crypto.errors.dbx_errors import DbxTransactionNotFoundError
from crypto.solana_rpc import SolanaRpcClient


class DbxTransactionReader:
    def __init__(self, rpc: Optional[SolanaRpcClient] = None) -> None:
        self.rpc = rpc or SolanaRpcClient()

    async def read_required(self, signature: str) -> dict[str, Any]:
        transaction = await self.rpc.get_transaction(signature)

        if transaction is None:
            raise DbxTransactionNotFoundError(
                "Solana transaction details are not available",
                details={"signature": signature},
            )

        return transaction

    async def read_optional(self, signature: str) -> dict[str, Any] | None:
        return await self.rpc.get_transaction(signature)