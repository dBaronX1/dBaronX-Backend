import { internalApiRequest } from "@/lib/http/internal-api-client";
import { InternalApiError } from "@/lib/http/internal-api-client";
import type {
  AiStoriesAdminDashboard,
  CommerceAdminDashboard,
  FastapiHandoffPack,
  LaunchClosure,
  PlatformAdminPack,
  ReadinessMatrix,
} from "@/lib/platform/backend-contracts";

function getLaunchClosureFallback(reason: string): LaunchClosure {
  return {
    ready: false,
    blockers: [`launch-closure unavailable: ${reason}`],
  };
}

export async function getLaunchClosure(): Promise<LaunchClosure> {
  if (typeof window === "undefined") {
    const internalServiceToken = String(process.env.INTERNAL_SERVICE_TOKEN ?? "").trim();
    if (!internalServiceToken) {
      return getLaunchClosureFallback("missing INTERNAL_SERVICE_TOKEN");
    }
  }

  try {
    const payload = await internalApiRequest<{ launchClosure: LaunchClosure }>(
      "/api/v1/system/launch-closure",
    );
    return payload.launchClosure;
  } catch (error) {
    if (error instanceof InternalApiError && error.status === 401) {
      return getLaunchClosureFallback("unauthorized internal API response");
    }

    throw error;
  }
}

export async function getReadinessMatrix(): Promise<ReadinessMatrix> {
  const payload = await internalApiRequest<{ readinessMatrix: ReadinessMatrix }>(
    "/api/v1/system/readiness-matrix",
  );
  return payload.readinessMatrix;
}

export async function getPlatformAdminPack(): Promise<PlatformAdminPack> {
  const payload = await internalApiRequest<{ platformAdminPack: PlatformAdminPack }>(
    "/api/v1/platform/admin-pack",
  );
  return payload.platformAdminPack;
}

export async function getFastapiHandoffPack(): Promise<FastapiHandoffPack> {
  const payload = await internalApiRequest<{ fastapi_handoff_pack: FastapiHandoffPack }>(
    "/fastapi-handoff-pack/snapshot",
  );
  return payload.fastapi_handoff_pack;
}

export async function getCommerceAdminDashboard(): Promise<CommerceAdminDashboard> {
  const payload = await internalApiRequest<{ commerceAdmin: CommerceAdminDashboard }>(
    "/api/v1/commerce/admin/dashboard",
  );
  return payload.commerceAdmin;
}

export async function getAiStoriesAdminDashboard(): Promise<AiStoriesAdminDashboard> {
  const payload = await internalApiRequest<{ aiStoriesAdmin: AiStoriesAdminDashboard }>(
    "/api/v1/ai-stories/admin/dashboard",
  );
  return payload.aiStoriesAdmin;
}
