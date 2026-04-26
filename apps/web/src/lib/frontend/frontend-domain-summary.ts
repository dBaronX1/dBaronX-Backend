import { getAiStoriesAdminDashboard, getCommerceAdminDashboard, getFastapiHandoffPack, getLaunchClosure, getPlatformAdminPack, getReadinessMatrix } from "@/lib/platform/platform-api";

export async function getFrontendDomainSummary() {
  const [launch, matrix, platform, fastapi, commerce, aiStories] =
    await Promise.all([
      getLaunchClosure(),
      getReadinessMatrix(),
      getPlatformAdminPack(),
      getFastapiHandoffPack(),
      getCommerceAdminDashboard(),
      getAiStoriesAdminDashboard(),
    ]);

  const payouts = (platform.summary?.payouts ?? {}) as Record<string, unknown>;
  const ads = (platform.summary?.ads ?? {}) as Record<string, unknown>;
  const suppliers = (platform.summary?.suppliers ?? {}) as Record<string, unknown>;
  const payments = (platform.summary?.payments ?? {}) as Record<string, unknown>;
  const wallet = (platform.summary?.wallet ?? {}) as Record<string, unknown>;

  return {
    launch,
    matrix,
    platform,
    fastapi,
    commerce,
    aiStories,
    payouts,
    ads,
    suppliers,
    payments,
    wallet,
  };
}
