import { internalApiRequest } from "@/lib/http/internal-api-client";
import type {
  AiStoriesAdminDashboard,
  CommerceAdminDashboard,
  FastapiHandoffPack,
  LaunchClosure,
  PlatformAdminPack,
  ReadinessMatrix,
} from "@/lib/platform/backend-contracts";

export async function getLaunchClosure(): Promise<LaunchClosure> {
  const payload = await internalApiRequest<{ launchClosure: LaunchClosure }>(
    "/api/v1/system/launch-closure",
  );
  return payload.launchClosure;
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
