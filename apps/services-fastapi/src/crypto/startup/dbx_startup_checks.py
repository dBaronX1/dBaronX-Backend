from __future__ import annotations

from dataclasses import dataclass, field

from crypto.config.dbx_settings import DbxSettings, get_dbx_settings
from crypto.utils.base58_validator import is_base58


@dataclass
class StartupCheckResult:
    ok: bool
    failures: list[str] = field(default_factory=list)
    warnings: list[str] = field(default_factory=list)

    def as_dict(self) -> dict:
        return {
            "ok": self.ok,
            "failures": self.failures,
            "warnings": self.warnings,
        }


class DbxStartupChecks:
    def __init__(self, settings: DbxSettings | None = None) -> None:
        self.settings = settings or get_dbx_settings()

    def run(self) -> StartupCheckResult:
        failures: list[str] = []
        warnings: list[str] = []

        if not self.settings.internal_service_token:
            failures.append("INTERNAL_SERVICE_TOKEN is missing")

        if self.settings.production and len(self.settings.internal_service_token) < 20:
            failures.append("INTERNAL_SERVICE_TOKEN is too short for production")

        if not self.settings.solana_rpc_url.startswith(("https://", "http://")):
            failures.append("SOLANA_RPC_URL must be HTTP(S)")

        if not is_base58(self.settings.dbx_mint_address, min_len=32, max_len=44):
            failures.append("DBX_MINT_ADDRESS is invalid")

        if self.settings.dbx_decimals != 9:
            failures.append("DBX_DECIMALS must be 9")

        if not self.settings.dbx_treasury_wallet:
            warnings.append("DBX_TREASURY_WALLET missing in FastAPI; NestJS still sends expected treasury per request")
        elif not is_base58(self.settings.dbx_treasury_wallet, min_len=32, max_len=44):
            failures.append("DBX_TREASURY_WALLET is invalid")

        if "mainnet-beta.solana.com" in self.settings.solana_rpc_url and self.settings.production:
            warnings.append("Using public Solana RPC in production may rate-limit DBX payments")

        return StartupCheckResult(ok=len(failures) == 0, failures=failures, warnings=warnings)

    def assert_ready(self) -> None:
        result = self.run()
        if not result.ok:
            raise RuntimeError(f"DBX startup checks failed: {result.failures}")