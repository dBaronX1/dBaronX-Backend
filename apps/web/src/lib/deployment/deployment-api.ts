import { internalApiRequest } from "@/lib/http/internal-api-client";

export interface BootstrapReportPayload {
  success: boolean;
  bootstrapReport: {
    bootstrap: Record<string, unknown>;
    startupSequence: Record<string, unknown>;
    bootstrapHardening: Record<string, unknown>;
  };
}

export interface ReadinessMatrixPayload {
  success: boolean;
  readinessMatrix: Record<string, unknown>;
}

export async function getBootstrapReport(): Promise<BootstrapReportPayload> {
  return internalApiRequest<BootstrapReportPayload>(
    "/api/v1/system/bootstrap-report",
  );
}

export async function getReadinessMatrixPayload(): Promise<ReadinessMatrixPayload> {
  return internalApiRequest<ReadinessMatrixPayload>(
    "/api/v1/system/readiness-matrix",
  );
}
