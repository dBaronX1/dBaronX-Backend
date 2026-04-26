import { internalApiRequest } from "@/lib/http/internal-api-client";

export interface FinalReleasePackPayload {
  success: boolean;
  finalReleasePack: {
    frontendClosure: Record<string, unknown>;
    finalLaunchClosure: Record<string, unknown>;
    medusaFinalClosure: Record<string, unknown>;
    deploymentReadiness: Record<string, unknown>;
    startupGate: Record<string, unknown>;
    runtimeContract: Record<string, unknown>;
  };
}

export async function getFinalReleasePack(): Promise<FinalReleasePackPayload> {
  return internalApiRequest<FinalReleasePackPayload>(
    "/api/v1/system/final-release-pack",
  );
}
