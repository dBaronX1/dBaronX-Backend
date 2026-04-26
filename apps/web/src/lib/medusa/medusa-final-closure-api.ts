import { internalApiRequest } from "@/lib/http/internal-api-client";

export interface MedusaFinalClosurePackPayload {
  success: boolean;
  medusaFinalClosurePack: {
    closed: boolean;
    boundary: Record<string, unknown>;
    reconciliation: Record<string, unknown>;
    contract: Record<string, unknown>;
    normalization: Record<string, unknown>;
  };
}

export async function getMedusaFinalClosurePack(): Promise<MedusaFinalClosurePackPayload> {
  return internalApiRequest<MedusaFinalClosurePackPayload>(
    "/api/v1/commerce/final-closure",
  );
}
