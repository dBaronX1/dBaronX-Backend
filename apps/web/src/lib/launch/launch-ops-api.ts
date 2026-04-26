import { internalApiRequest } from "@/lib/http/internal-api-client";

export interface LaunchAuditTrailPayload {
  success: boolean;
  launchAuditTrail: {
    startupAudit: {
      entries: Array<Record<string, unknown>>;
      summary: Record<string, unknown>;
    };
    intelligenceAuditTraces: Array<Record<string, unknown>>;
    readinessSnapshots: Array<Record<string, unknown>>;
  };
}

export interface SystemOperationsHandoffPayload {
  success: boolean;
  operationsHandoff: {
    launchClosure: Record<string, unknown>;
    moduleClosure: Record<string, unknown>;
    orchestrationIndex: Record<string, unknown>;
    serviceDependencyMap: Record<string, unknown>;
    nextSubsystems: string[];
  };
}

export async function getLaunchAuditTrail(): Promise<LaunchAuditTrailPayload> {
  return internalApiRequest<LaunchAuditTrailPayload>(
    "/api/v1/system/launch-audit-trail",
  );
}

export async function getSystemOperationsHandoff(): Promise<SystemOperationsHandoffPayload> {
  return internalApiRequest<SystemOperationsHandoffPayload>(
    "/api/v1/system/operations-handoff",
  );
}
