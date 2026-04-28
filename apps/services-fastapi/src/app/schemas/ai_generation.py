from __future__ import annotations

from pydantic import AliasChoices, Field, field_validator

from app.schemas.common import DBXModel


_ALLOWED_GENRES = {
    "fantasy",
    "science fiction",
    "sci-fi",
    "romance",
    "thriller",
    "mystery",
    "drama",
    "adventure",
    "horror",
    "historical",
    "children",
    "young adult",
    "rewrite",
    "continuation",
}

_ALLOWED_TONES = {
    "dark",
    "hopeful",
    "epic",
    "playful",
    "cinematic",
    "lyrical",
    "serious",
    "warm",
    "refined",
    "consistent",
}


class StoryGenerationRequest(DBXModel):
    user_id: str | None = Field(
        default=None,
        max_length=128,
        validation_alias=AliasChoices("user_id", "userId"),
    )
    request_id: str | None = Field(
        default=None,
        max_length=128,
        validation_alias=AliasChoices("request_id", "requestId", "idempotency_key", "idempotencyKey"),
    )
    title_hint: str | None = Field(
        default=None,
        max_length=160,
        validation_alias=AliasChoices("title_hint", "titleHint", "title"),
    )
    prompt: str = Field(
        min_length=10,
        max_length=12000,
        validation_alias=AliasChoices("prompt", "text", "input", "query"),
    )
    genre: str = Field(min_length=2, max_length=80)
    tone: str = Field(min_length=2, max_length=80)
    language: str = Field(min_length=2, max_length=32, default="en")
    max_output_tokens: int = Field(
        default=1400,
        ge=128,
        le=6000,
        validation_alias=AliasChoices("max_output_tokens", "maxOutputTokens", "max_tokens", "maxTokens"),
    )
    temperature: float = Field(default=0.8, ge=0, le=2)
    provider_hint: str | None = Field(
        default=None,
        max_length=50,
        validation_alias=AliasChoices("provider_hint", "providerHint", "provider"),
    )
    safe_mode: bool = Field(
        default=True,
        validation_alias=AliasChoices("safe_mode", "safeMode"),
    )
    metadata: dict = Field(default_factory=dict)

    @field_validator("genre")
    @classmethod
    def normalize_genre(cls, value: str) -> str:
        normalized = value.strip().lower()
        if normalized not in _ALLOWED_GENRES:
            return normalized
        return normalized

    @field_validator("tone")
    @classmethod
    def normalize_tone(cls, value: str) -> str:
        normalized = value.strip().lower()
        if normalized not in _ALLOWED_TONES:
            return normalized
        return normalized

    @field_validator("language")
    @classmethod
    def normalize_language(cls, value: str) -> str:
        return value.strip().lower()

    @field_validator("prompt")
    @classmethod
    def normalize_prompt(cls, value: str) -> str:
        normalized = value.strip()
        if len(normalized) < 10:
            raise ValueError("prompt is too short")
        return normalized


class StoryContinuationRequest(DBXModel):
    user_id: str | None = Field(
        default=None,
        max_length=128,
        validation_alias=AliasChoices("user_id", "userId"),
    )
    story_id: str = Field(
        min_length=1,
        max_length=128,
        validation_alias=AliasChoices("story_id", "storyId", "id"),
    )
    existing_content: str = Field(
        min_length=20,
        max_length=50000,
        validation_alias=AliasChoices("existing_content", "existingContent", "story", "content"),
    )
    continuation_prompt: str = Field(
        min_length=3,
        max_length=4000,
        validation_alias=AliasChoices("continuation_prompt", "continuationPrompt", "prompt"),
    )
    max_output_tokens: int = Field(
        default=1200,
        ge=128,
        le=4000,
        validation_alias=AliasChoices("max_output_tokens", "maxOutputTokens", "max_tokens", "maxTokens"),
    )
    provider_hint: str | None = Field(
        default=None,
        max_length=50,
        validation_alias=AliasChoices("provider_hint", "providerHint", "provider"),
    )


class StoryRewriteRequest(DBXModel):
    user_id: str | None = Field(
        default=None,
        max_length=128,
        validation_alias=AliasChoices("user_id", "userId"),
    )
    source_content: str = Field(
        min_length=20,
        max_length=50000,
        validation_alias=AliasChoices("source_content", "sourceContent", "story", "content"),
    )
    rewrite_goal: str = Field(
        min_length=3,
        max_length=4000,
        validation_alias=AliasChoices("rewrite_goal", "rewriteGoal", "goal", "prompt"),
    )
    preserve_plot: bool = Field(
        default=True,
        validation_alias=AliasChoices("preserve_plot", "preservePlot"),
    )
    tone: str | None = Field(default=None, max_length=80)
    language: str | None = Field(default=None, max_length=32)
    provider_hint: str | None = Field(
        default=None,
        max_length=50,
        validation_alias=AliasChoices("provider_hint", "providerHint", "provider"),
    )


class StoryGenerationResult(DBXModel):
    success: bool
    provider: str
    model: str
    title: str
    content: str
    excerpt: str
    tags: list[str] = Field(default_factory=list)
    moderation_passed: bool
    quality_score: float = Field(ge=0, le=1)
    request_id: str | None = None
    usage: dict = Field(default_factory=dict)
