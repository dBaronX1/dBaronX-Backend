from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends

from crypto.config.dbx_settings import DbxSettings
from crypto.dependencies.dbx_dependencies import InternalAuthDependency, get_settings
from crypto.schemas.dbx_diagnostics_schemas import DbxDiagnosticsResponse
from crypto.dbx_feature_flags import DbxFeatureFlags

router = APIRouter(prefix="/internal/dbx", tags=["internal-dbx-diagnostics"])


@router.get("/diagnostics", response_model=DbxDiagnosticsResponse)
async def dbx_diagnostics(
    _auth: InternalAuthDependency,
    settings: Annotated[DbxSettings, Depends(get_settings)],
) -> DbxDiagnosticsResponse:
    return DbxDiagnosticsResponse(
        success=True,
        environment=settings.app_env,
        rpcConfigured=bool(settings.solana_rpc_url),
        internalTokenConfigured=bool(settings.internal_service_token),
        mintAddress=settings.dbx_mint_address,
        decimals=settings.dbx_decimals,
        treasuryConfigured=bool(settings.dbx_treasury_wallet),
        requireFinalized=settings.require_finalized,
        featureFlags=DbxFeatureFlags().snapshot(),
    )