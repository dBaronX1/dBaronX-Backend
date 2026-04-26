import { internalApiRequest } from "@/lib/http/internal-api-client";

export interface FinalVerificationPackPayload {
  success: boolean;
  finalVerificationPack: {
    closed: boolean;
    checks: Record<string, boolean>;
    blockers: string[];
    appShellWiring: Record<string, unknown>;
    controllerRegistry: Record<string, unknown>;
    canonicalCompletion: Record<string, unknown>;
    finalizationReadiness: Record<string, unknown>;
  };
}

export async function getFinalVerificationPack(): Promise<FinalVerificationPackPayload> {
  return internalApiRequest<FinalVerificationPackPayload>(
    "/api/v1/system/final-verification-pack",
  );
}
