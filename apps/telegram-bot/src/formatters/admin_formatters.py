from __future__ import annotations

from typing import Any


def format_launch_closure(payload: dict[str, Any]) -> str:
    closure = payload.get("launchClosure") or payload.get("launchClosure", {})
    ready = closure.get("ready")
    blockers = closure.get("blockers", [])

    lines = [
        "Launch Closure",
        f"Ready: {'YES' if ready else 'NO'}",
        f"Blockers: {len(blockers)}",
    ]
    if blockers:
        lines.append("Top blockers:")
        lines.extend(f"- {item}" for item in blockers[:10])
    return "\n".join(lines)


def format_readiness_matrix(payload: dict[str, Any]) -> str:
    matrix = payload.get("readinessMatrix", {})
    lines = ["Readiness Matrix"]
    for key, value in matrix.items():
        lines.append(
            f"- {key}: {'READY' if value.get('ready') else 'NOT READY'}"
        )
    return "\n".join(lines)


def format_review_queue(title: str, items: list[dict[str, Any]]) -> str:
    lines = [title, f"Items: {len(items)}"]
    for item in items[:10]:
        item_id = item.get("id") or item.get("campaignId") or item.get("campaign_id") or item.get("payout_request_id")
        status = item.get("status", "unknown")
        score = item.get("priority_score", item.get("review_score", "n/a"))
        lines.append(f"- {item_id} | {status} | score={score}")
    return "\n".join(lines)


def format_fastapi_closure(payload: dict[str, Any]) -> str:
    closure = payload.get("final_fastapi_subsystem_closure", {})
    return "\n".join(
        [
            "FastAPI Closure",
            f"Closed: {'YES' if closure.get('closed') else 'NO'}",
            f"Step1: {'YES' if closure.get('step1_closed') else 'NO'}",
            f"Operational: {'YES' if closure.get('operational_closure_closed') else 'NO'}",
            f"Enforcement: {'YES' if closure.get('enforcement_sweep_closed') else 'NO'}",
            f"Blockers: {len(closure.get('blockers', []))}",
        ]
    )
