from __future__ import annotations

from typing import Any

from app.services.prompt_policy_service import PromptPolicyService


class StoryPromptEnhancementService:
    """
    Converts weak user prompts into stronger generation directives without
    changing user intent.

    Optimized for:
    - mobile-first low-bandwidth UX
    - better generation quality on first attempt
    - lower wasted token spend
    """

    def __init__(self, *, prompt_policy_service: PromptPolicyService) -> None:
        self.prompt_policy = prompt_policy_service

    def enhance(
        self,
        *,
        prompt: str,
        genre: str,
        tone: str,
        language: str,
    ) -> dict[str, Any]:
        self.prompt_policy.validate(prompt)
        normalized = self.prompt_policy.normalize(prompt)

        guidance = {
            "genre": genre,
            "tone": tone,
            "language": language,
            "quality_goals": [
                "clear protagonist intent",
                "strong opening hook",
                "coherent plot progression",
                "mobile-readable pacing",
                "safe and monetizable language",
            ],
        }

        enhanced_prompt = "\n".join(
            [
                f"Write an original {genre} story in {language}.",
                f"Use a {tone} tone.",
                "Make the opening compelling within the first paragraph.",
                "Keep characters, conflict, and progression clear.",
                "Avoid filler and generic repetition.",
                f"Core story request: {normalized}",
            ]
        )

        return {
            "enhanced_prompt": enhanced_prompt,
            "guidance": guidance,
        }
