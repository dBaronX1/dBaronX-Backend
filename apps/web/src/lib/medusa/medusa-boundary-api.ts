import { internalApiRequest } from "@/lib/http/internal-api-client";

export interface MedusaBoundaryProofPayload {
  success: boolean;
  medusaBoundaryProof: {
    allowedResponsibilities: string[];
    forbiddenResponsibilities: string[];
    proofStatements: string[];
  };
}

export async function getMedusaBoundaryProof(): Promise<MedusaBoundaryProofPayload> {
  return internalApiRequest<MedusaBoundaryProofPayload>(
    "/api/v1/commerce/boundary-proof",
  );
}
