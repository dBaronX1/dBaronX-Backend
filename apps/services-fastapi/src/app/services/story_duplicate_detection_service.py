from __future__ import annotations

import hashlib
import re
from collections import Counter
from typing import Any


class StoryDuplicateDetectionService:
    """
    Canonical duplicate detector.

    Purpose:
    - reject near-duplicate generation spam
    - prevent creator self-spam in discovery
    - support NestJS moderation and publishing flows
    - work even before vector infrastructure is introduced
    """

    def analyze(
        self,
        *,
        content: str,
        comparison_contents: list[str],
        threshold: float = 0.86,
    ) -> dict[str, Any]:
        normalized_source = self._normalize_required(content, "content")
        source_signature = self._signature(normalized_source)
        source_vector = self._token_vector(normalized_source)

        safe_threshold = max(0.5, min(threshold, 0.99))
        comparisons: list[dict[str, Any]] = []

        best_match: dict[str, Any] | None = None

        for index, candidate in enumerate(comparison_contents):
            normalized_candidate = self._normalize_required(candidate, f"comparison_contents[{index}]")
            candidate_signature = self._signature(normalized_candidate)
            candidate_vector = self._token_vector(normalized_candidate)

            exact_match = source_signature == candidate_signature
            similarity = 1.0 if exact_match else self._cosine_similarity(
                source_vector,
                candidate_vector,
            )

            result = {
                "index": index,
                "exact_match": exact_match,
                "similarity": round(similarity, 6),
                "fingerprint": candidate_signature,
                "duplicate": exact_match or similarity >= safe_threshold,
            }
            comparisons.append(result)

            if best_match is None or result["similarity"] > best_match["similarity"]:
                best_match = result

        duplicate_found = any(item["duplicate"] for item in comparisons)

        return {
            "success": True,
            "duplicate_found": duplicate_found,
            "threshold": safe_threshold,
            "source_fingerprint": source_signature,
            "best_match": best_match,
            "comparisons": comparisons,
        }

    def _normalize_required(self, value: str, field_name: str) -> str:
        cleaned = value.strip()
        if not cleaned:
            raise ValueError(f"{field_name} is required")
        return cleaned

    def _signature(self, content: str) -> str:
        normalized = self._normalize_text(content)
        return hashlib.sha256(normalized.encode("utf-8")).hexdigest()

    def _normalize_text(self, content: str) -> str:
        content = content.lower()
        content = re.sub(r"\s+", " ", content).strip()
        content = re.sub(r"[^a-z0-9\s'\-]", "", content)
        return content

    def _token_vector(self, content: str) -> Counter[str]:
        normalized = self._normalize_text(content)
        tokens = re.findall(r"[a-z0-9][a-z0-9'\-]{1,}", normalized)
        return Counter(tokens)

    def _cosine_similarity(
        self,
        a: Counter[str],
        b: Counter[str],
    ) -> float:
        if not a or not b:
            return 0.0

        shared = set(a.keys()) & set(b.keys())
        dot = sum(a[token] * b[token] for token in shared)

        mag_a = sum(value * value for value in a.values()) ** 0.5
        mag_b = sum(value * value for value in b.values()) ** 0.5

        if mag_a == 0 or mag_b == 0:
            return 0.0

        return dot / (mag_a * mag_b)
