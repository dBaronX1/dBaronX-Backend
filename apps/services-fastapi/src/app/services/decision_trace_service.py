from __future__ import annotations

from datetime import datetime, timezone
from typing import Any
import hashlib
import json


class DecisionTraceService:
    """
    Canonical lightweight decision trace builder.

    Purpose:
    - produce immutable trace envelopes for NestJS, ops, and audit storage
    - avoid leaking raw sensitive payloads
    - create deterministic trace hashes for idempotency and reconciliation
    """

    SENSITIVE_KEYS = {
        "authorization",
        "cookie",
        "set-cookie",
        "password",
        "secret",
        "token",
        "api_key",
        "apiSecret",
        "api_secret",
        "card_number",
        "cvv",
        "cvc",
        "passcode",
    }

    def build(
        self,
        *,
        flow_type: str,
        decision_payload: dict[str, Any],
        request_payload: dict[str, Any] | None = None,
        metadata: dict[str, Any] | None = None,
    ) -> dict[str, Any]:
        normalized_flow = self._normalize_flow(flow_type)
        safe_request_payload = self._sanitize(request_payload or {})
        safe_decision_payload = self._sanitize(decision_payload)
        safe_metadata = self._sanitize(metadata or {})

        canonical_source = {
            "flow_type": normalized_flow,
            "request_payload": safe_request_payload,
            "decision_payload": safe_decision_payload,
            "metadata": safe_metadata,
        }

        canonical_json = json.dumps(
            canonical_source,
            sort_keys=True,
            separators=(",", ":"),
            default=str,
        )
        trace_hash = hashlib.sha256(canonical_json.encode("utf-8")).hexdigest()

        return {
            "success": True,
            "decision_trace": {
                "flow_type": normalized_flow,
                "trace_hash": trace_hash,
                "generated_at": datetime.now(timezone.utc).isoformat(),
                "request_payload": safe_request_payload,
                "decision_payload": safe_decision_payload,
                "metadata": safe_metadata,
            },
        }

    def _normalize_flow(self, value: str) -> str:
        cleaned = str(value).strip().lower()
        if not cleaned:
            raise ValueError("flow_type is required")
        return cleaned

    def _sanitize(self, value: Any) -> Any:
        if isinstance(value, dict):
            output: dict[str, Any] = {}
            for key, child in value.items():
                lowered = str(key).strip().lower()
                if lowered in self.SENSITIVE_KEYS:
                    output[str(key)] = "[REDACTED]"
                else:
                    output[str(key)] = self._sanitize(child)
            return output

        if isinstance(value, list):
            return [self._sanitize(item) for item in value]

        if isinstance(value, tuple):
            return [self._sanitize(item) for item in value]

        return value
