import { internalApiRequest } from "@/lib/http/internal-api-client";

export interface FinalLaunchClosurePayload {
  success: boolean;
  finalLaunchClosure: {
    closed: boolean;
    launchClosure: Record<string, unknown>;
    shellClosure: Record<string, unknown>;
  };
}

export async function getFinalLaunchClosure(): Promise<FinalLaunchClosurePayload> {
  return internalApiRequest<FinalLaunchClosurePayload>(
    "/api/v1/system/final-launch-closure",
  );
}
