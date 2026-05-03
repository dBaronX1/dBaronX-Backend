from __future__ import annotations

from dataclasses import dataclass

from fastapi import APIRouter

from app.api.routes.account_trust_profile import router as account_trust_profile_router
from app.api.routes.affiliate_campaign_readiness import (
    router as affiliate_campaign_readiness_router,
)
from app.api.routes.affiliate_payout_risk import router as affiliate_payout_risk_router
from app.api.routes.affiliate_velocity import router as affiliate_velocity_router
from app.api.routes.api_router_audit import router as api_router_audit_router
from app.api.routes.creator_promotion_risk import (
    router as creator_promotion_risk_router,
)
from app.api.routes.decision_bundle import router as decision_bundle_router
from app.api.routes.decision_bundle_manifest import (
    router as decision_bundle_manifest_router,
)
from app.api.routes.decision_consistency import router as decision_consistency_router
from app.api.routes.decision_contract_catalog import (
    router as decision_contract_catalog_router,
)
from app.api.routes.decision_policy_registry import (
    router as decision_policy_registry_router,
)
from app.api.routes.decision_trace import router as decision_trace_router
from app.api.routes.deployment_checklist import router as deployment_checklist_router
from app.api.routes.device_fingerprint import router as device_fingerprint_router
from app.api.routes.economic_surface_coverage import (
    router as economic_surface_coverage_router,
)
from app.api.routes.expected_router_registry import (
    router as expected_router_registry_router,
)
from app.api.routes.final_operational_closure import (
    router as final_operational_closure_router,
)
from app.api.routes.fastapi_step1_closure import router as fastapi_step1_closure_router
from app.api.routes.fastapi_handoff_pack import router as fastapi_handoff_pack_router
from app.api.routes.fraud_decision import router as fraud_decision_router
from app.api.routes.intelligence_bootstrap_manifest import (
    router as intelligence_bootstrap_manifest_router,
)
from app.api.routes.intelligence_capability import (
    router as intelligence_capability_router,
)
from app.api.routes.intelligence_health import router as intelligence_health_router
from app.api.routes.intelligence_startup_gate import (
    router as intelligence_startup_gate_router,
)
from app.api.routes.internal_access_contract import (
    router as internal_access_contract_router,
)
from app.api.routes.internal_endpoint_access_matrix import (
    router as internal_endpoint_access_matrix_router,
)
from app.api.routes.internal_endpoint_guard_manifest import (
    router as internal_endpoint_guard_manifest_router,
)
from app.api.routes.internal_route_protection_audit import (
    router as internal_route_protection_audit_router,
)
from app.api.routes.ip_reputation import router as ip_reputation_router
from app.api.routes.launch_operation_manifest import (
    router as launch_operation_manifest_router,
)
from app.api.routes.launch_control_manifest import (
    router as launch_control_manifest_router,
)
from app.api.routes.launch_readiness_score import (
    router as launch_readiness_score_router,
)
from app.api.routes.nestjs_handshake import router as nestjs_handshake_router
from app.api.routes.operational_readiness import router as operational_readiness_router
from app.api.routes.payment_intelligence_readiness import (
    router as payment_intelligence_readiness_router,
)
from app.api.routes.payment_preflight_decision import (
    router as payment_preflight_decision_router,
)
from app.api.routes.payment_telemetry import router as payment_telemetry_router
from app.api.routes.public_runtime_summary import (
    router as public_runtime_summary_router,
)
from app.api.routes.request_audit_envelope import (
    router as request_audit_envelope_router,
)
from app.api.routes.root_health import router as root_health_router
from app.api.routes.root_liveness import router as root_liveness_router
from app.api.routes.root_readiness import router as root_readiness_router
from app.api.routes.root_status import router as root_status_router
from app.api.routes.route_coverage_audit import (
    router as route_coverage_audit_router,
)
from app.api.routes.router_inclusion_closure import (
    router as router_inclusion_closure_router,
)
from app.api.routes.runtime_dependency_manifest import (
    router as runtime_dependency_manifest_router,
)
from app.api.routes.runtime_export_manifest import (
    router as runtime_export_manifest_router,
)
from app.api.routes.runtime_snapshot import router as runtime_snapshot_router
from app.api.routes.startup_sequence_manifest import (
    router as startup_sequence_manifest_router,
)
from app.api.routes.startup_shell import router as startup_shell_router
from app.api.routes.story_promotion_eligibility import (
    router as story_promotion_eligibility_router,
)
from app.api.routes.story_promotion_readiness import (
    router as story_promotion_readiness_router,
)
from app.api.routes.story_quote_signal import router as story_quote_signal_router
from app.api.routes.subsystem_contract_compatibility import (
    router as subsystem_contract_compatibility_router,
)
from app.api.routes.subsystem_readiness_matrix import (
    router as subsystem_readiness_matrix_router,
)
from app.api.routes.system_decision_manifest import (
    router as system_decision_manifest_router,
)
from app.api.routes.system_route_registry import router as system_route_registry_router
from app.api.routes.telegram_operational_manifest import (
    router as telegram_operational_manifest_router,
)
from app.api.routes.telemetry_integrity import router as telemetry_integrity_router
from app.api.routes.w2e_campaign_readiness import (
    router as w2e_campaign_readiness_router,
)
from app.api.routes.w2e_reward_decision import router as w2e_reward_decision_router
from app.api.routes.watch_session_anomaly import (
    router as watch_session_anomaly_router,
)


@dataclass(frozen=True, slots=True)
class RouterRegistration:
    name: str
    prefix: str
    router: APIRouter
    internal_only: bool
    critical: bool


def get_router_registrations() -> list[RouterRegistration]:
    return [
        RouterRegistration("root_status", "", root_status_router, False, True),
        RouterRegistration("root_liveness", "/health", root_liveness_router, False, True),
        RouterRegistration("root_readiness", "/health", root_readiness_router, False, True),
        RouterRegistration("root_health", "/health", root_health_router, False, True),
        RouterRegistration("public_runtime_summary", "/public-runtime-summary", public_runtime_summary_router, False, False),
        RouterRegistration("runtime_snapshot", "/runtime-snapshot", runtime_snapshot_router, False, False),
        RouterRegistration("startup_shell", "/startup-shell", startup_shell_router, False, True),
        RouterRegistration("expected_router_registry", "/expected-router-registry", expected_router_registry_router, False, False),
        RouterRegistration("api_router_audit", "/api-router-audit", api_router_audit_router, False, True),
        RouterRegistration("router_inclusion_closure", "/router-inclusion-closure", router_inclusion_closure_router, False, True),
        RouterRegistration("internal_endpoint_guard_manifest", "/internal-endpoint-guard-manifest", internal_endpoint_guard_manifest_router, False, False),
        RouterRegistration("internal_endpoint_access_matrix", "/internal-endpoint-access-matrix", internal_endpoint_access_matrix_router, False, False),
        RouterRegistration("internal_route_protection_audit", "/internal-route-protection-audit", internal_route_protection_audit_router, False, True),
        RouterRegistration("internal_access_contract", "/internal-access-contract", internal_access_contract_router, False, False),
        RouterRegistration("runtime_dependency_manifest", "/runtime-dependency-manifest", runtime_dependency_manifest_router, False, True),
        RouterRegistration("runtime_export_manifest", "/runtime-export-manifest", runtime_export_manifest_router, True, True),
        RouterRegistration("deployment_checklist", "/deployment-checklist", deployment_checklist_router, False, True),
        RouterRegistration("launch_readiness_score", "/launch-readiness-score", launch_readiness_score_router, False, True),
        RouterRegistration("launch_operation_manifest", "/launch-operation-manifest", launch_operation_manifest_router, False, True),
        RouterRegistration("final_operational_closure", "/final-operational-closure", final_operational_closure_router, False, True),
        RouterRegistration("system_decision_manifest", "/system-decision-manifest", system_decision_manifest_router, False, False),
        RouterRegistration("system_route_registry", "/system-route-registry", system_route_registry_router, False, False),
        RouterRegistration("intelligence_capability", "/intelligence-capability", intelligence_capability_router, False, False),
        RouterRegistration("operational_readiness", "/operational-readiness", operational_readiness_router, False, False),
        RouterRegistration("subsystem_readiness_matrix", "/subsystem-readiness-matrix", subsystem_readiness_matrix_router, False, False),
        RouterRegistration("economic_surface_coverage", "/economic-surface-coverage", economic_surface_coverage_router, False, False),
        RouterRegistration("decision_policy_registry", "/decision-policy-registry", decision_policy_registry_router, False, False),
        RouterRegistration("decision_contract_catalog", "/decision-contract-catalog", decision_contract_catalog_router, False, False),
        RouterRegistration("decision_bundle_manifest", "/decision-bundle-manifest", decision_bundle_manifest_router, False, False),
        RouterRegistration("intelligence_bootstrap_manifest", "/intelligence-bootstrap-manifest", intelligence_bootstrap_manifest_router, False, True),
        RouterRegistration("intelligence_startup_gate", "/intelligence-startup-gate", intelligence_startup_gate_router, False, True),
        RouterRegistration("intelligence_health", "/intelligence-health", intelligence_health_router, False, True),
        RouterRegistration("startup_sequence_manifest", "/startup-sequence-manifest", startup_sequence_manifest_router, False, True),
        RouterRegistration("nestjs_handshake", "/nestjs-handshake", nestjs_handshake_router, False, True),
        RouterRegistration("telegram_operational_manifest", "/telegram-operational-manifest", telegram_operational_manifest_router, False, True),
        RouterRegistration("decision_trace", "/decision-trace", decision_trace_router, True, True),
        RouterRegistration("request_audit_envelope", "/request-audit-envelope", request_audit_envelope_router, True, True),
        RouterRegistration("decision_consistency", "/decision-consistency", decision_consistency_router, False, True),
        RouterRegistration("decision_bundle", "/decision-bundle", decision_bundle_router, True, True),
        RouterRegistration("fraud_decision", "/fraud-decision", fraud_decision_router, False, True),
        RouterRegistration("device_fingerprint", "/device-fingerprint", device_fingerprint_router, False, False),
        RouterRegistration("ip_reputation", "/ip-reputation", ip_reputation_router, False, False),
        RouterRegistration("account_trust_profile", "/account-trust-profile", account_trust_profile_router, False, False),
        RouterRegistration("watch_session_anomaly", "/watch-session-anomaly", watch_session_anomaly_router, False, True),
        RouterRegistration("telemetry_integrity", "/telemetry-integrity", telemetry_integrity_router, False, True),
        RouterRegistration("w2e_reward_decision", "/w2e-reward-decision", w2e_reward_decision_router, False, True),
        RouterRegistration("w2e_campaign_readiness", "/w2e-campaign-readiness", w2e_campaign_readiness_router, False, True),
        RouterRegistration("affiliate_velocity", "/affiliate-velocity", affiliate_velocity_router, False, True),
        RouterRegistration("affiliate_payout_risk", "/affiliate-payout-risk", affiliate_payout_risk_router, False, True),
        RouterRegistration("affiliate_campaign_readiness", "/affiliate-campaign-readiness", affiliate_campaign_readiness_router, False, True),
        RouterRegistration("payment_telemetry", "/payment-telemetry", payment_telemetry_router, False, True),
        RouterRegistration("payment_preflight_decision", "/payment-preflight-decision", payment_preflight_decision_router, False, True),
        RouterRegistration("payment_intelligence_readiness", "/payment-intelligence-readiness", payment_intelligence_readiness_router, False, True),
        RouterRegistration("creator_promotion_risk", "/creator-promotion-risk", creator_promotion_risk_router, False, True),
        RouterRegistration("story_promotion_eligibility", "/story-promotion-eligibility", story_promotion_eligibility_router, False, True),
        RouterRegistration("story_quote_signal", "/story-quote-signal", story_quote_signal_router, False, True),
        RouterRegistration("story_promotion_readiness", "/story-promotion-readiness", story_promotion_readiness_router, False, True),
    ]
