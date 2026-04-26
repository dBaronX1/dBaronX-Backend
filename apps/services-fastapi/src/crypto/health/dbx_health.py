from __future__ import annotations

from typing import Any

from crypto.config.dbx_settings import get_dbx_settings
from crypto.solana_rpc import SolanaRpcClient


class DbxHealthService:
    def __init__(self, rpc: SolanaRpcClient | None = None) -> None:
        self.settings = get_dbx_settings()
        self.rpc = rpc or SolanaRpcClient(
            rpc_url=self.settings.solana_rpc_url,
            timeout_seconds=min(self.settings.rpc_timeout_seconds, 5.0),
        )

    async def health(self) -> dict[str, Any]:
        checks = {
            "internalServiceTokenConfigured": bool(self.settings.internal_service_token),
            "solanaRpcConfigured": bool(self.settings.solana_rpc_url),
            "dbxMintConfigured": bool(self.settings.dbx_mint_address),
            "treasuryWalletConfigured": bool(self.settings.dbx_treasury_wallet),
            "decimalsValid": self.settings.dbx_decimals == 9,
        }

        return {
            "ok": all(checks.values()),
            "source": "fastapi-dbx-verification",
            "checks": checks,
            "token": {
                "name": "dBaronX",
                "symbol": "DBX",
                "network": "solana",
                "mintAddress": self.settings.dbx_mint_address,
                "decimals": self.settings.dbx_decimals,
                "treasuryWallet": self.settings.dbx_treasury_wallet or None,
            },
        }