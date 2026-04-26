from __future__ import annotations

from typing import Any


class PersistenceExportContractService:
    """
    Canonical persistence/export contract for NestJS and ops storage.

    Defines the stable export shapes FastAPI can produce for:
    - decision traces
    - request audit envelopes
    - runtime export manifests
    - launch/closure manifests
    """

    def build(self) -> dict[str, Any]:
        contracts = {
            "decision_trace": {
                "recommended_store": "supabase.audit_decision_traces",
                "required_keys": [
                    "flow_type",
                    "trace_hash",
                    "generated_at",
                    "request_payload",
                    "decision_payload",
                    "metadata",
                ],
            },
            "request_audit_envelope": {
                "recommended_store": "supabase.audit_request_envelopes",
                "required_keys": [
                    "generated_at",
                    "route_path",
                    "method",
                    "identity",
                    "payload_summary",
                    "response_summary",
                    "tags",
                ],
            },
            "runtime_export_manifest": {
                "recommended_store": "supabase.runtime_export_manifests",
                "required_keys": [
                    "version",
                    "export_payload",
                ],
            },
            "launch_operation_manifest": {
                "recommended_store": "supabase.launch_operation_manifests",
                "required_keys": [
                    "launch_ready",
                    "blockers",
                    "intelligence_health_status",
                    "subsystem_ready_count",
                    "subsystem_total_count",
                    "internal_access_mode",
                    "startup_sequence",
                ],
            },
            "final_operational_closure": {
                "recommended_store": "supabase.final_operational_closures",
                "required_keys": [
                    "closed",
                    "blockers",
                    "router_audit",
                    "route_protection",
                    "deployment",
                    "launch",
                ],
            },
        }

        return {
            "success": True,
            "persistence_export_contract": {
                "version": "1.0.0",
                "contracts": contracts,
            },
        }
