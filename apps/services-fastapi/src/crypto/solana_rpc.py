from __future__ import annotations

import os
from typing import Any, Optional

import httpx
from fastapi import HTTPException, status


class SolanaRpcClient:
    def __init__(
        self,
        *,
        rpc_url: Optional[str] = None,
        timeout_seconds: float = 12.0,
    ) -> None:
        self.rpc_url = (
            rpc_url
            or os.getenv("SOLANA_RPC_URL")
            or os.getenv("DBX_SOLANA_RPC_URL")
            or "https://api.mainnet-beta.solana.com"
        ).strip()
        self.timeout_seconds = timeout_seconds

    async def get_signature_status(self, signature: str) -> dict[str, Any] | None:
        payload = {
            "jsonrpc": "2.0",
            "id": "dbx-signature-status",
            "method": "getSignatureStatuses",
            "params": [[signature], {"searchTransactionHistory": True}],
        }

        data = await self._post(payload)
        values = data.get("result", {}).get("value") or []
        if not values:
            return None

        return values[0]

    async def get_transaction(self, signature: str) -> dict[str, Any] | None:
        payload = {
            "jsonrpc": "2.0",
            "id": "dbx-get-transaction",
            "method": "getTransaction",
            "params": [
                signature,
                {
                    "encoding": "jsonParsed",
                    "commitment": "confirmed",
                    "maxSupportedTransactionVersion": 0,
                },
            ],
        }

        data = await self._post(payload)
        return data.get("result")

    async def _post(self, payload: dict[str, Any]) -> dict[str, Any]:
        try:
            async with httpx.AsyncClient(timeout=self.timeout_seconds) as client:
                response = await client.post(self.rpc_url, json=payload)
        except httpx.TimeoutException as exc:
            raise HTTPException(
                status_code=status.HTTP_504_GATEWAY_TIMEOUT,
                detail={
                    "code": "SOLANA_RPC_TIMEOUT",
                    "message": "Solana RPC request timed out.",
                },
            ) from exc
        except httpx.HTTPError as exc:
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail={
                    "code": "SOLANA_RPC_UNAVAILABLE",
                    "message": "Solana RPC request failed.",
                },
            ) from exc

        if response.status_code >= 500:
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail={
                    "code": "SOLANA_RPC_SERVER_ERROR",
                    "message": "Solana RPC returned a server error.",
                    "status_code": response.status_code,
                },
            )

        if response.status_code >= 400:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={
                    "code": "SOLANA_RPC_BAD_REQUEST",
                    "message": "Solana RPC rejected the request.",
                    "status_code": response.status_code,
                },
            )

        data = response.json()

        if data.get("error"):
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail={
                    "code": "SOLANA_RPC_ERROR",
                    "message": data["error"].get("message", "Solana RPC returned an error."),
                    "rpc_error": data["error"],
                },
            )

        return data
