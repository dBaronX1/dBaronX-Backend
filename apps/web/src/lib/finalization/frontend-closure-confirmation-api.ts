import { internalApiRequest } from "@/lib/http/internal-api-client";

export interface FrontendClosureConfirmationPayload {
  success: boolean;
  frontendClosureConfirmation: {
    closed: boolean;
    checks: Record<string, boolean>;
    blockers: string[];
    requestId: string | null;
    note: string;
  };
}

export async function getFrontendClosureConfirmation(): Promise<FrontendClosureConfirmationPayload> {
  return internalApiRequest<FrontendClosureConfirmationPayload>(
    "/api/v1/system/frontend-closure-confirmation",
  );
}
