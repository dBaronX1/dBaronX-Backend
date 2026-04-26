from __future__ import annotations

from dataclasses import dataclass
from typing import Iterable


@dataclass(frozen=True, slots=True)
class GuardedRouteFamily:
    prefix: str
    enforcement_mode: str
    reason: str


def get_guarded_route_families() -> list[GuardedRouteFamily]:
    """
    Canonical source of truth for route families that MUST be protected by
    internal-access enforcement.

    These are routes whose primary consumers are:
    - NestJS economic brain
    - Telegram admin/control surface
    - internal ops tooling
    """

    return [
        GuardedRouteFamily(
            prefix="/decision-trace",
            enforcement_mode="internal_only",
            reason="decision traces contain internal operational evidence",
        ),
        GuardedRouteFamily(
            prefix="/request-audit-envelope",
            enforcement_mode="internal_only",
            reason="request audit envelopes expose internal identity and payload traces",
        ),
        GuardedRouteFamily(
            prefix="/decision-bundle",
            enforcement_mode="internal_only",
            reason="decision bundles are backend-only orchestration artifacts",
        ),
        GuardedRouteFamily(
            prefix="/runtime-export-manifest",
            enforcement_mode="internal_only",
            reason="runtime export surfaces are intended for backend persistence",
        ),
    ]


def guarded_prefixes() -> list[str]:
    return [item.prefix for item in get_guarded_route_families()]


def is_guarded_prefix(prefix: str) -> bool:
    normalized = "/" + prefix.strip("/")
    return normalized in set(guarded_prefixes())


def iter_guarded_prefixes() -> Iterable[str]:
    yield from guarded_prefixes()
