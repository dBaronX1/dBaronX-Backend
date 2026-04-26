import { internalApiRequest } from "@/lib/http/internal-api-client";

export interface AffiliatePayoutOverview {
  totalPayoutRequests: number;
  statusCounts: Record<string, number>;
  totals: {
    totalRequested: number;
    totalSettled: number;
    totalRejected: number;
  };
  recentPayoutRequests: Record<string, unknown>[];
}

export async function getAffiliatePayoutOverview(): Promise<AffiliatePayoutOverview> {
  const payload = await internalApiRequest<{
    platformAdminPack: {
      summary: {
        payouts: AffiliatePayoutOverview;
      };
    };
  }>("/api/v1/platform/admin-pack");

  return payload.platformAdminPack.summary.payouts;
}
