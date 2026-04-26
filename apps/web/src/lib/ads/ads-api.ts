import { internalApiRequest } from "@/lib/http/internal-api-client";

export interface AdsBillingPack {
  campaignId: string;
  advertiserId: string;
  status: string;
  currency: string;
  budget: number;
  spent: number;
  remaining: number;
  utilizationRate: number;
}

export async function getAdsBillingPack(
  campaignId: string,
): Promise<AdsBillingPack> {
  const payload = await internalApiRequest<{
    billingPack: AdsBillingPack;
  }>(`/api/v1/ads/billing-pack/${campaignId}`);

  return payload.billingPack;
}
