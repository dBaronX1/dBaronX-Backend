import { Injectable, NotFoundException } from "@nestjs/common";
import { SupabaseService } from "../../shared/services/supabase.service";

@Injectable()
export class AiStoryDistributionPackService {
  constructor(private readonly supabase: SupabaseService) {}

  async build(campaignId: string) {
    const { data: campaign, error } = await this.supabase
      .getClient()
      .from("ai_story_campaigns")
      .select("*")
      .eq("id", campaignId)
      .maybeSingle();

    if (error) {
      throw error;
    }

    if (!campaign) {
      throw new NotFoundException({
        success: false,
        message: "AI story campaign not found",
      });
    }

    const distributionPack = {
      campaignId,
      headline: campaign.title,
      primaryText: String(campaign.content || "").slice(0, 600),
      targetChannel: campaign.target_channel,
      language: campaign.language || "en",
      tags: campaign.tags || [],
      locales: campaign.target_locales || [],
      channels: campaign.distribution_channels || [],
      spend: Number(campaign.proposed_spend_amount || 0),
      prompt: campaign.prompt || null,
    };

    return {
      success: true,
      distributionPack,
    };
  }
}
