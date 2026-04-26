import { internalApiRequest } from "@/lib/http/internal-api-client";

export interface MedusaClosureSnapshot {
  success: boolean;
  medusaSyncContract: {
    domains: Record<
      string,
      {
        sourceOfTruth: string;
        mirroredInto: string;
        allowedFields: string[];
      }
    >;
    prohibitedEconomicLogicInMedusa: string[];
  };
  medusaFulfillmentNormalizationPolicy: {
    providerNormalization: Record<string, string>;
    statusNormalization: Record<string, string>;
    rules: string[];
  };
}

export async function getMedusaClosureSnapshot(): Promise<MedusaClosureSnapshot> {
  return internalApiRequest<MedusaClosureSnapshot>(
    "/api/v1/commerce/sync-contract",
  );
}
