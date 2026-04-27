export type FastapiDecision = "allow" | "review" | "deny";

export interface FastapiIdentityHeaders {
  "x-internal-token": string;
  "x-request-id"?: string;
  "x-caller-service"?: string;
  "x-caller-surface"?: string;
  "x-actor-id"?: string;
}

export interface FastapiBootstrapRuntimeGuard {
  guard_passed: boolean;
  blockers: string[];
  startup_safe: boolean;
  router_mount_verified: boolean;
  router_enforcement_passed: boolean;
}

export interface FastapiStep1Closure {
  closed: boolean;
  ready_to_shift_to_nestjs: boolean;
  go_live_allowed: boolean;
  blockers: string[];
}

export interface FastapiHandshakeSummary {
  compatible: boolean;
  version: string;
  capabilities: {
    version: string;
    decision_surface_count: number;
    route_count: number;
    contract_groups: string[];
    categories: Record<string, string[]>;
  };
  bootstrap_manifest: {
    bootstrap_ready: boolean;
    health_status: string;
    subsystems: Record<string, unknown>;
  };
  startup_gate: {
    status: string;
    blockers: string[];
  };
  decision_bundle_manifest: {
    version: string;
    bundle_count: number;
    bundles: Record<string, unknown>;
  };
}

export interface FastapiRuntimeSnapshot {
  captured_at: string;
  status: string;
  launch_band: string;
  launch_score: number;
  runtime_dependencies_ready: boolean;
  blocker_count: number;
  blockers: string[];
}

export interface FastapiLaunchControlManifest {
  go_live_allowed: boolean;
  launch_band: string;
  launch_score: number;
  deployment_allowed: boolean;
  closure_closed: boolean;
  startup_sequence_ready: boolean;
  blockers: string[];
}

export type FastapiEnvelope<T> = {
  success: boolean;
} & Partial<T> & Record<string, unknown>;
