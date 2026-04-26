from __future__ import annotations

import re
from dataclasses import dataclass
from typing import Iterable


@dataclass(frozen=True)
class PromptPolicyRule:
    code: str
    pattern: str
    message: str
    block: bool = True


class PromptPolicyService:
    """
    Canonical prompt governance layer for the dBaronX intelligence system.

    Responsibilities:
    - normalize prompts into a predictable form for downstream providers
    - block clearly disallowed or malformed prompt classes
    - enrich prompts with stable production instruction framing
    - keep provider-facing prompts compact to reduce token burn on mobile flows
    """

    def __init__(self) -> None:
        self._rules: tuple[PromptPolicyRule, ...] = (
            PromptPolicyRule(
                code="empty_prompt",
                pattern=r"^\s*$",
                message="prompt is empty",
            ),
            PromptPolicyRule(
                code="prompt_too_short",
                pattern=r"^\s*.{0,2}\s*$",
                message="prompt is too short",
            ),
            PromptPolicyRule(
                code="self_harm",
                pattern=r"\b(self[- ]?harm|suicide|kill myself)\b",
                message="prompt contains restricted self-harm content",
            ),
            PromptPolicyRule(
                code="extremism",
                pattern=r"\b(terrorist manifesto|bomb making|ethnic cleansing)\b",
                message="prompt contains restricted extremist content",
            ),
        )

        self._collapsed_whitespace = re.compile(r"\s+")
        self._control_chars = re.compile(r"[\x00-\x08\x0B\x0C\x0E-\x1F]")

    def validate(self, prompt: str) -> None:
        candidate = prompt or ""

        for rule in self._rules:
            if re.search(rule.pattern, candidate, flags=re.IGNORECASE | re.MULTILINE):
                if rule.block:
                    raise ValueError(rule.message)

    def normalize(self, prompt: str) -> str:
        candidate = prompt or ""
        candidate = self._control_chars.sub(" ", candidate)
        candidate = candidate.replace("\r\n", "\n").replace("\r", "\n")
        candidate = self._collapsed_whitespace.sub(" ", candidate).strip()
        return candidate

    def enrich(
        self,
        prompt: str,
        *,
        tone: str | None = None,
        language: str | None = None,
        genre: str | None = None,
        max_words: int | None = None,
        extra_constraints: Iterable[str] | None = None,
    ) -> str:
        """
        Produces a compact provider-ready instruction block.
        Strong enough for high-quality generation, small enough to avoid waste.
        """
        sections: list[str] = [
            "Create a high-quality story output.",
            f"Prompt: {prompt}",
        ]

        if genre:
            sections.append(f"Genre: {genre}")
        if tone:
            sections.append(f"Tone: {tone}")
        if language:
            sections.append(f"Language: {language}")
        if max_words:
            sections.append(f"Max words: {max_words}")

        if extra_constraints:
            cleaned = [item.strip() for item in extra_constraints if str(item).strip()]
            if cleaned:
                sections.append("Constraints:")
                sections.extend(f"- {item}" for item in cleaned)

        sections.append(
            "Output requirements: coherent narrative, strong readability, no unsafe content, no filler."
        )

        return "\n".join(sections)
