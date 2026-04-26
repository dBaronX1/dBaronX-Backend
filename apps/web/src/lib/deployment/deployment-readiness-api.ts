import { internalApiRequest } from "@/lib/http/internal-api-client";

export interface DeploymentReadinessPayload {
  success: boolean;
  deploymentReadiness: {
    ready: boolean;
    checks: Record<string, boolean>;
    blockers: string[];
  };
}

export async function getDeploymentReadiness(): Promise<DeploymentReadinessPayload> {
  return internalApiRequest<DeploymentReadinessPayload>(
    "/api/v1/system/deployment-readiness",
  );
}
