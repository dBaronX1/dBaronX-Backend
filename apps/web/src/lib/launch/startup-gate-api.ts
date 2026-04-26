import { internalApiRequest } from "@/lib/http/internal-api-client";

export interface StartupGatePayload {
  success: boolean;
  startupGate: {
    passed: boolean;
    requiredChecks: string[];
    note: string;
  };
}

export async function getStartupGate(): Promise<StartupGatePayload> {
  return internalApiRequest<StartupGatePayload>(
    "/api/v1/system/startup-gate",
  );
}
