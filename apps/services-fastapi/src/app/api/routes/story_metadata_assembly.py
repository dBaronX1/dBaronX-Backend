from __future__ import annotations

from fastapi import APIRouter, Depends

from app.schemas.story_metadata_assembly import (
    StoryMetadataAssemblyRequest,
    StoryMetadataAssemblyResponse,
)
from app.services.story_metadata_assembly_service import StoryMetadataAssemblyService

router = APIRouter(prefix="/story-metadata-assembly", tags=["story-metadata-assembly"])


def story_metadata_assembly_service_dep() -> StoryMetadataAssemblyService:
    return StoryMetadataAssemblyService()


@router.post("/run", response_model=StoryMetadataAssemblyResponse)
async def assemble_story_metadata(
    payload: StoryMetadataAssemblyRequest,
    service: StoryMetadataAssemblyService = Depends(story_metadata_assembly_service_dep),
):
    result = await service.assemble(
        content=payload.content,
        prompt=payload.prompt,
        title=payload.title,
        language=payload.language,
        audience=payload.audience,
    )
    return StoryMetadataAssemblyResponse(**result)
