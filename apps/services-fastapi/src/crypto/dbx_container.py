from __future__ import annotations

from functools import lru_cache

from crypto.config.dbx_settings import get_dbx_settings
from crypto.health.dbx_health import DbxHealthService
from crypto.policies.dbx_verification_policy import DbxVerificationPolicy
from crypto.services.dbx_instruction_parser import DbxInstructionParser
from crypto.services.dbx_status_reader import DbxStatusReader
from crypto.services.dbx_transaction_reader import DbxTransactionReader
from crypto.services.dbx_transfer_matcher import DbxTransferMatcher
from crypto.solana_rpc import SolanaRpcClient


class DbxVerificationContainer:
    def __init__(self) -> None:
        self.settings = get_dbx_settings()
        self.rpc = SolanaRpcClient(
            rpc_url=self.settings.solana_rpc_url,
            timeout_seconds=self.settings.rpc_timeout_seconds,
        )
        self.policy = DbxVerificationPolicy(self.settings)
        self.status_reader = DbxStatusReader(self.rpc)
        self.transaction_reader = DbxTransactionReader(self.rpc)
        self.instruction_parser = DbxInstructionParser()
        self.transfer_matcher = DbxTransferMatcher()
        self.health = DbxHealthService(self.rpc)


@lru_cache(maxsize=1)
def get_dbx_container() -> DbxVerificationContainer:
    return DbxVerificationContainer()