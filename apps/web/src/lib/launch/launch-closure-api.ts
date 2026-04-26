import { internalApiRequest } from "@/lib/http/internal-api-client";

export interface LaunchClosurePayload {
  success: boolean;
  launchClosure: {
    ready: boolean;
    blockers: string[];
    closure?: Record<string, unknown>;
    bootstrapHardening?: Record<string, unknown>;
    commerce?: Record<string, unknown>;
    boundary?: Record<string, unknown>;
    launchGate?: Record<string, unknown>;
  };
}

export interface LaunchReadinessPayload {
  success: boolean;
  launchReadiness: Record<string, unknown>;
}

export async function getLaunchClosurePayload(): Promise<LaunchClosurePayload> {
  return internalApiRequest<LaunchClosurePayload>(
    "/api/v1/system/launch-closure",
  );
}

export async function getLaunchReadinessPayload(): Promise<LaunchReadinessPayload> {
  return internalApiRequest<LaunchReadinessPayload>(
    "/api/v1/system/launch-readiness",
  );
}
