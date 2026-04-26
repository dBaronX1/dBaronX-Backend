from __future__ import annotations

from fastapi import APIRouter, Depends, status

from apps.services_fastapi.src.modules.watch.repositories.fraud_event_repository import (
    FraudEventRepository,
)
from apps.services_fastapi.src.modules.watch.schemas.session_forensics_contracts import (
    SessionForensicsResponse,
)
from apps.services_fastapi.src.modules.watch.services.session_forensics_service import (
    SessionForensicsService,
)
from apps.services_fastapi.src.shared.dependencies.database import get_async_session

router = APIRouter(prefix="/watch/forensics", tags=["watch-forensics"])


def get_forensics_service(session=Depends(get_async_session)) -> SessionForensicsService:
    repository = FraudEventRepository(session)
    return SessionForensicsService(repository)


@router.get(
    "/session/{session_id}",
    response_model=SessionForensicsResponse,
    status_code=status.HTTP_200_OK,
)
async def get_session_forensics(
    session_id: str,
    service: SessionForensicsService = Depends(get_forensics_service),
) -> SessionForensicsResponse:
    return await service.get(session_id)
