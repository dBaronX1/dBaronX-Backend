import { Injectable, NotFoundException } from "@nestjs/common";
import { SupabaseService } from "../../shared/services/supabase.service";

@Injectable()
export class AdsBillingPackService {
  constructor(private readonly supabase: SupabaseService) {}

  async build(campaignId: string) {
    const { data: campaign, error } = await this.supabase
      .getClient()
      .from("ad_campaigns")
      .select("*")
      .eq("id", campaignId)
      .maybeSingle();

    if (error) {
      throw error;
    }

    if (!campaign) {
      throw new NotFoundException({
        success: false,
        message: "Ad campaign not found",
      });
    }

    const budget = Number(campaign.budget || 0);
    const spent = Number(campaign.spent_budget || 0);
    const remaining = Number(
      campaign.remaining_budget ?? Math.max(budget - spent, 0),
    );

    return {
      success: true,
      billingPack: {
        campaignId,
        advertiserId: campaign.advertiser_id,
        status: campaign.status,
        currency: campaign.currency,
        budget,
        spent,
        remaining,
        utilizationRate: budget > 0 ? Number((spent / budget).toFixed(4)) : 0,
      },
    };
  }
}
