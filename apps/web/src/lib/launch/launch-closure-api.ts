import { internalApiRequest } from "@/lib/http/internal-api-client";
import { InternalApiError } from "@/lib/http/internal-api-client";

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
  try {
    return await internalApiRequest<LaunchClosurePayload>(
      "/api/v1/system/launch-closure",
    );
  } catch (error) {
    if (error instanceof InternalApiError && (error.status === 401 || error.status === 404)) {
      return {
        success: false,
        launchClosure: {
          ready: false,
          blockers: [`launch-closure unavailable: internal API status ${error.status}`],
        },
      };
    }

    throw error;
  }
}

export async function getLaunchReadinessPayload(): Promise<LaunchReadinessPayload> {
  return internalApiRequest<LaunchReadinessPayload>(
    "/api/v1/system/launch-readiness",
  );
}
