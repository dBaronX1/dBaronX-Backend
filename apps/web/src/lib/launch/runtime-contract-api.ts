import { internalApiRequest } from "@/lib/http/internal-api-client";

export interface RuntimeContractPayload {
  success: boolean;
  runtimeContract: {
    services: Record<
      string,
      {
        required: boolean;
        purpose: string;
      }
    >;
    rules: string[];
  };
}

export async function getRuntimeContract(): Promise<RuntimeContractPayload> {
  return internalApiRequest<RuntimeContractPayload>(
    "/api/v1/system/runtime-contract",
  );
}
