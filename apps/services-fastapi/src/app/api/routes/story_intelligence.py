from __future__ import annotations

from fastapi import APIRouter, Depends

from app.api.dependencies import (
    content_moderation_service_dep,
    story_classification_service_dep,
    story_enrichment_service_dep,
    story_prompt_enhancement_service_dep,
)
from app.schemas.story_intelligence import (
    StoryClassificationRequest,
    StoryClassificationResponse,
    StoryEnrichmentRequest,
    StoryEnrichmentResponse,
    StoryModerationRequest,
    StoryModerationResponse,
    StoryPromptEnhancementRequest,
    StoryPromptEnhancementResponse,
)
from app.services.content_moderation_service import ContentModerationService
from app.services.story_classification_service import StoryClassificationService
from app.services.story_enrichment_service import StoryEnrichmentService
from app.services.story_prompt_enhancement_service import StoryPromptEnhancementService

router = APIRouter(prefix="/story-intelligence", tags=["story-intelligence"])


@router.post("/classify", response_model=StoryClassificationResponse)
async def classify_story(
    payload: StoryClassificationRequest,
    service: StoryClassificationService = Depends(story_classification_service_dep),
):
    classification = service.classify(
        title=payload.title,
        content=payload.content,
        genre=payload.genre,
        tone=payload.tone,
        language=payload.language,
    )
    return StoryClassificationResponse(
        success=True,
        classification=classification,
    )


@router.post("/moderate", response_model=StoryModerationResponse)
async def moderate_story_text(
    payload: StoryModerationRequest,
    service: ContentModerationService = Depends(content_moderation_service_dep),
):
    moderation = service.assess_text(payload.text)
    return StoryModerationResponse(
        success=True,
        moderation=moderation,
    )


@router.post("/enrich", response_model=StoryEnrichmentResponse)
async def enrich_story(
    payload: StoryEnrichmentRequest,
    service: StoryEnrichmentService = Depends(story_enrichment_service_dep),
):
    result = service.enrich(
        title=payload.title,
        content=payload.content,
        genre=payload.genre,
        tone=payload.tone,
        language=payload.language,
        existing_texts=payload.existing_texts,
    )
    return StoryEnrichmentResponse(success=True, **result)


@router.post("/enhance-prompt", response_model=StoryPromptEnhancementResponse)
async def enhance_prompt(
    payload: StoryPromptEnhancementRequest,
    service: StoryPromptEnhancementService = Depends(story_prompt_enhancement_service_dep),
):
    result = service.enhance(
        prompt=payload.prompt,
        genre=payload.genre,
        tone=payload.tone,
        language=payload.language,
    )
    return StoryPromptEnhancementResponse(
        success=True,
        original_prompt=payload.prompt,
        enhanced_prompt=result["enhanced_prompt"],
        guidance=result["guidance"],
    )
