import { internalApiRequest } from "@/lib/http/internal-api-client";

export interface AiStoryCampaignDistributionPack {
  campaignId: string;
  headline: string;
  primaryText: string;
  targetChannel: string;
  language: string;
  tags: string[];
  locales: string[];
  channels: string[];
  spend: number;
  prompt: string | null;
}

export async function getAiStoryDistributionPack(
  campaignId: string,
): Promise<AiStoryCampaignDistributionPack> {
  const payload = await internalApiRequest<{
    distributionPack: AiStoryCampaignDistributionPack;
  }>(`/api/v1/ai-stories/distribution-pack/${campaignId}`);

  return payload.distributionPack;
}
