import { internalApiRequest } from "@/lib/http/internal-api-client";

export interface MedusaReconciliationProofPayload {
  success: boolean;
  medusaReconciliationProof: {
    reconciliationOwnership: Record<string, string>;
    medusaRole: Record<string, boolean>;
    rules: string[];
  };
}

export async function getMedusaReconciliationProof(): Promise<MedusaReconciliationProofPayload> {
  return internalApiRequest<MedusaReconciliationProofPayload>(
    "/api/v1/commerce/reconciliation-proof",
  );
}
