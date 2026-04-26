import { internalApiRequest } from "@/lib/http/internal-api-client";

export interface FinalizationReadinessPayload {
  success: boolean;
  finalizationReadiness: {
    closed: boolean;
    checks: Record<string, boolean>;
    blockers: string[];
    requestId: string | null;
    note: string;
  };
}

export interface ControllerRegistryPayload {
  success: boolean;
  controllerRegistry: {
    commerce: string[];
    system: string[];
    note: string;
  };
}

export async function getFinalizationReadiness(): Promise<FinalizationReadinessPayload> {
  return internalApiRequest<FinalizationReadinessPayload>(
    "/api/v1/system/finalization-readiness",
  );
}

export async function getControllerRegistry(): Promise<ControllerRegistryPayload> {
  return internalApiRequest<ControllerRegistryPayload>(
    "/api/v1/system/controller-registry",
  );
}
