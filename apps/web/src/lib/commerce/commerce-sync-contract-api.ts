import { internalApiRequest } from "@/lib/http/internal-api-client";

export interface MedusaSyncContractPayload {
  success: boolean;
  medusaSyncContract: {
    domains: {
      products: {
        sourceOfTruth: string;
        mirroredInto: string;
        allowedFields: string[];
      };
      variants: {
        sourceOfTruth: string;
        mirroredInto: string;
        allowedFields: string[];
      };
      fulfillments: {
        sourceOfTruth: string;
        mirroredInto: string;
        allowedFields: string[];
      };
    };
    prohibitedEconomicLogicInMedusa: string[];
  };
  medusaFulfillmentNormalizationPolicy: {
    providerNormalization: Record<string, string>;
    statusNormalization: Record<string, string>;
    rules: string[];
  };
}

export async function getCommerceSyncContract(): Promise<MedusaSyncContractPayload> {
  return internalApiRequest<MedusaSyncContractPayload>(
    "/api/v1/commerce/sync-contract",
  );
}
