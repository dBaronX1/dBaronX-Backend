import { internalApiRequest } from "@/lib/http/internal-api-client";

export interface SystemAdminSummaryPayload {
  success: boolean;
  systemAdminSummary: {
    wallet: Record<string, unknown>;
    payouts: Record<string, unknown>;
    payments: Record<string, unknown>;
    suppliers: Record<string, unknown>;
    ads: Record<string, unknown>;
    aiStories: Record<string, unknown>;
    commerce: Record<string, unknown>;
  };
}

export interface SystemShellClosurePayload {
  success: boolean;
  shellClosure: {
    closed: boolean;
    blockers: string[];
    platformShell: Record<string, unknown>;
    adminSummary: Record<string, unknown>;
    adminOps: Record<string, unknown>;
    readinessMatrix: Record<string, unknown>;
  };
}

export async function getSystemAdminSummary(): Promise<SystemAdminSummaryPayload> {
  return internalApiRequest<SystemAdminSummaryPayload>(
    "/api/v1/system/admin-summary/dashboard",
  );
}

export async function getSystemShellClosure(): Promise<SystemShellClosurePayload> {
  return internalApiRequest<SystemShellClosurePayload>(
    "/api/v1/system/shell-closure",
  );
}
