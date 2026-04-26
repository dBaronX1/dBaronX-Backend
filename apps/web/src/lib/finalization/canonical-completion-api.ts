import { internalApiRequest } from "@/lib/http/internal-api-client";

export interface CanonicalCompletionPayload {
  success: boolean;
  canonicalCompletion: {
    closed: boolean;
    checks: Record<string, boolean>;
    blockers: string[];
    completionBand: string;
    nextAction: string;
  };
}

export interface FinalIntegrationVerificationPayload {
  success: boolean;
  finalIntegrationVerification: {
    closed: boolean;
    checks: Record<string, boolean>;
    blockers: string[];
    requestId: string | null;
    note: string;
  };
}

export interface CommerceFinalClosureReadinessPayload {
  success: boolean;
  commerceFinalClosureReadiness: {
    closed: boolean;
    checks: Record<string, boolean>;
    blockers: string[];
    nextAction: string;
  };
}

export async function getCanonicalCompletion(): Promise<CanonicalCompletionPayload> {
  return internalApiRequest<CanonicalCompletionPayload>(
    "/api/v1/system/canonical-completion",
  );
}

export async function getFinalIntegrationVerification(): Promise<FinalIntegrationVerificationPayload> {
  return internalApiRequest<FinalIntegrationVerificationPayload>(
    "/api/v1/system/final-integration-verification",
  );
}

export async function getCommerceFinalClosureReadiness(): Promise<CommerceFinalClosureReadinessPayload> {
  return internalApiRequest<CommerceFinalClosureReadinessPayload>(
    "/api/v1/commerce/final-closure-readiness",
  );
}
