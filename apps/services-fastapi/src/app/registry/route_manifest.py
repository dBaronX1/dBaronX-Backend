from __future__ import annotations

from dataclasses import dataclass
from typing import Literal


RouteStrength = Literal["required", "optional"]


@dataclass(frozen=True)
class AppRouteManifestEntry:
    module_path: str
    router_name: str = "router"
    prefix: str = ""
    tags: tuple[str, ...] = ()
    strength: RouteStrength = "optional"

    @property
    def required(self) -> bool:
        return self.strength == "required"


APP_ROUTE_MANIFEST: tuple[AppRouteManifestEntry, ...] = (
    AppRouteManifestEntry(
        module_path="crypto.dbx_internal_api",
        prefix="",
        tags=("internal-dbx",),
        strength="required",
    ),
    AppRouteManifestEntry(
        module_path="src.routers.health",
        prefix="",
        tags=("health",),
        strength="optional",
    ),
    AppRouteManifestEntry(
        module_path="src.ai.routes.stories",
        prefix="/stories",
        tags=("ai-stories",),
        strength="optional",
    ),
    AppRouteManifestEntry(
        module_path="src.ai.routes.chat",
        prefix="/ai",
        tags=("ai",),
        strength="optional",
    ),
    AppRouteManifestEntry(
        module_path="src.watch.routes.watch",
        prefix="/watch",
        tags=("watch-to-earn",),
        strength="optional",
    ),
    AppRouteManifestEntry(
        module_path="src.fraud.routes.fraud",
        prefix="/fraud",
        tags=("fraud",),
        strength="optional",
    ),
    AppRouteManifestEntry(
        module_path="src.wallet.routes.wallet",
        prefix="/wallet",
        tags=("wallet",),
        strength="optional",
    ),
    AppRouteManifestEntry(
        module_path="src.settlement.routes.settlement",
        prefix="/settlement",
        tags=("settlement",),
        strength="optional",
    ),
)