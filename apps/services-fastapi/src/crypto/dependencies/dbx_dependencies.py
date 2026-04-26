from __future__ import annotations

from typing import Annotated

from fastapi import Depends, Request

from crypto.config.dbx_settings import DbxSettings, get_dbx_settings
from crypto.dbx_container import DbxVerificationContainer, get_dbx_container
from crypto.dbx_security import require_internal_service_token
from crypto.health.dbx_health import DbxHealthService
from crypto.policies.dbx_verification_policy import DbxVerificationPolicy
from crypto.services.dbx_instruction_parser import DbxInstructionParser
from crypto.services.dbx_status_reader import DbxStatusReader
from crypto.services.dbx_transaction_reader import DbxTransactionReader
from crypto.services.dbx_transfer_matcher import DbxTransferMatcher


InternalAuthDependency = Annotated[dict[str, str], Depends(require_internal_service_token)]


def get_settings() -> DbxSettings:
    return get_dbx_settings()


def get_container() -> DbxVerificationContainer:
    return get_dbx_container()


def get_policy(
    container: Annotated[DbxVerificationContainer, Depends(get_container)],
) -> DbxVerificationPolicy:
    return container.policy


def get_status_reader(
    container: Annotated[DbxVerificationContainer, Depends(get_container)],
) -> DbxStatusReader:
    return container.status_reader


def get_transaction_reader(
    container: Annotated[DbxVerificationContainer, Depends(get_container)],
) -> DbxTransactionReader:
    return container.transaction_reader


def get_instruction_parser(
    container: Annotated[DbxVerificationContainer, Depends(get_container)],
) -> DbxInstructionParser:
    return container.instruction_parser


def get_transfer_matcher(
    container: Annotated[DbxVerificationContainer, Depends(get_container)],
) -> DbxTransferMatcher:
    return container.transfer_matcher


def get_health_service(
    container: Annotated[DbxVerificationContainer, Depends(get_container)],
) -> DbxHealthService:
    return container.health


def request_id(request: Request) -> str:
    header = request.headers.get("x-request-id", "").strip()
    state_value = getattr(request.state, "request_id", "")
    return header or state_value or "unknown"


def service_name(request: Request) -> str:
    return request.headers.get("x-service-name", "unknown-service").strip() or "unknown-service"