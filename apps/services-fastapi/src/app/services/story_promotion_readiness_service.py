from __future__ import annotations

from typing import Any

from app.services.decision_contract_catalog_service import (
    DecisionContractCatalogService,
)
from app.services.decision_policy_registry_service import (
    DecisionPolicyRegistryService,
)
from app.services.system_route_registry_service import (
    SystemRouteRegistryService,
)


class StoryPromotionReadinessService:
    """
    Canonical AI-story promotion readiness audit.

    Confirms that the intelligence layer exposes enough coverage for:
    - promotion eligibility
    - quote multiplier signal generation
    - creator promotion risk
    - campaign brief generation
    """

    REQUIRED_PATHS = {
        "/story-promotion-eligibility/evaluate",
        "/story-quote-signal/evaluate",
        "/creator-promotion-risk/evaluate",
        "/story-campaign-brief/build",
    }

    def __init__(
        self,
        *,
        route_registry_service: SystemRouteRegistryService | None = None,
        contract_catalog_service: DecisionContractCatalogService | None = None,
        policy_registry_service: DecisionPolicyRegistryService | None = None,
    ) -> None:
        self.route_registry_service = (
            route_registry_service or SystemRouteRegistryService()
        )
        self.contract_catalog_service = (
            contract_catalog_service or DecisionContractCatalogService()
        )
        self.policy_registry_service = (
            policy_registry_service or DecisionPolicyRegistryService()
        )

    def build(self) -> dict[str, Any]:
        registry = self.route_registry_service.build()["route_registry"]
        contracts = self.contract_catalog_service.build()["contract_catalog"]["contracts"]
        policies = self.policy_registry_service.build()["policies"]

        present_paths = self._all_paths(registry)
        missing_paths = sorted(
            [path for path in self.REQUIRED_PATHS if path not in present_paths]
        )

        has_story_contracts = bool(contracts.get("ai_stories"))
        has_story_policy = bool(policies.get("ai_stories"))

        reasons: list[str] = []
        if missing_paths:
            reasons.append("missing_required_story_promotion_routes")
        if not has_story_contracts:
            reasons.append("missing_ai_stories_contracts")
        if not has_story_policy:
            reasons.append("missing_ai_stories_policy")

        ready = len(missing_paths) == 0 and has_story_contracts and has_story_policy

        return {
            "success": True,
            "story_promotion_readiness": {
                "ready": ready,
                "required_path_count": len(self.REQUIRED_PATHS),
                "missing_paths": missing_paths,
                "contract_support": {
                    "ai_stories": has_story_contracts,
                },
                "policy_support": {
                    "ai_stories": has_story_policy,
                },
                "reasons": reasons,
            },
        }

    def _all_paths(self, registry: dict[str, Any]) -> set[str]:
        groups = registry.get("groups", {})
        paths: set[str] = set()
        for entries in groups.values():
            for entry in entries:
                path = entry.get("path")
                if path:
                    paths.add(str(path))
        return paths
