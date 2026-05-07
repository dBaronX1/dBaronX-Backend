from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

_CAMEL_KEYS: dict[str, str] = {
    "nestjs_handshake": "nestjsHandshake",
    "launch_control_manifest": "launchControlManifest",
    "intelligence_startup_gate": "intelligenceStartupGate",
    "runtime_snapshot": "runtimeSnapshot",
    "fastapi_step1_closure": "fastapiStep1Closure",
}

_READY_KEYS: dict[str, tuple[str, ...]] = {
    "nestjs_handshake": ("compatible",),
    "launch_control_manifest": ("go_live_allowed",),
    "intelligence_startup_gate": ("startup_allowed",),
    "runtime_snapshot": ("runtime_dependencies_ready",),
    "fastapi_step1_closure": ("closed", "ready_to_shift_to_nestjs"),
}


def _timestamp(payload: dict[str, Any], data: dict[str, Any]) -> str:
    timestamp = (
        data.get("timestamp")
        or data.get("captured_at")
        or payload.get("timestamp")
    )
    return str(timestamp or datetime.now(timezone.utc).isoformat())


def _blockers(data: dict[str, Any], payload: dict[str, Any]) -> list[str]:
    raw_blockers = data.get("blockers", payload.get("blockers", []))
    if not isinstance(raw_blockers, list):
        return [str(raw_blockers)]

    return [str(blocker) for blocker in raw_blockers if str(blocker).strip()]


def _capabilities(data: dict[str, Any], payload: dict[str, Any]) -> list[str]:
    raw_capabilities = data.get("capabilities", payload.get("capabilities", []))
    if isinstance(raw_capabilities, dict):
        return [str(key) for key, enabled in raw_capabilities.items() if enabled]

    if not isinstance(raw_capabilities, list):
        return []

    return [str(capability) for capability in raw_capabilities]


def _ready(service_name: str, data: dict[str, Any], blockers: list[str]) -> bool:
    if isinstance(data.get("ready"), bool):
        return bool(data["ready"]) and not blockers

    if blockers:
        return False

    for key in _READY_KEYS.get(service_name, ()):
        if key in data and data[key] is not True:
            return False

    if data.get("status") in {"fail", "failed", "degraded", "not_ready", "error"}:
        return False

    return True


def _status(data: dict[str, Any], ready: bool) -> str:
    if not ready:
        return "degraded"

    status = str(data.get("status", "ok")).strip().lower()
    return "ok" if status in {"pass", "ready", "healthy"} else status or "ok"


def compat_snapshot(service_name: str, payload: dict[str, Any]) -> dict[str, Any]:
    data = (
        payload.get(service_name, {})
        if isinstance(payload.get(service_name), dict)
        else {}
    )
    blockers = _blockers(data, payload)
    ready = _ready(service_name, data, blockers)
    status = _status(data, ready)
    success = bool(payload.get("success", True)) and ready
    capabilities = _capabilities(data, payload)

    envelope: dict[str, Any] = {
        "success": success,
        "service": service_name,
        "status": status,
        "ready": ready,
        "timestamp": _timestamp(payload, data),
        "blockers": blockers,
        "capabilities": capabilities,
        service_name: data,
    }

    camel_key = _CAMEL_KEYS.get(service_name)
    if camel_key:
        envelope[camel_key] = data

    return envelope


def exception_blocker(service_name: str, exc: Exception) -> str:
    details: list[str] = []
    errors = getattr(exc, "errors", None)
    if callable(errors):
        for error in errors():
            loc = error.get("loc") if isinstance(error, dict) else None
            if loc:
                details.append(".".join(str(part) for part in loc))

    if isinstance(exc, ModuleNotFoundError) and getattr(exc, "name", None):
        details.append(str(exc.name))

    suffix = f": {','.join(sorted(set(details)))}" if details else ""
    return f"{service_name}_dependency_unavailable: {exc.__class__.__name__}{suffix}"


def degraded_snapshot(
    service_name: str,
    blocker: str,
    *,
    capabilities: list[str] | None = None,
) -> dict[str, Any]:
    data = {
        "ready": False,
        "status": "degraded",
        "blockers": [blocker],
        "capabilities": capabilities or [],
    }

    return compat_snapshot(service_name, {"success": False, service_name: data})
