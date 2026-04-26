import { Injectable } from "@nestjs/common";
import { SupabaseService } from "../../shared/services/supabase.service";

@Injectable()
export class AdsCampaignReviewService {
  constructor(private readonly supabase: SupabaseService) {}

  async queue() {
    const { data, error } = await this.supabase
      .getClient()
      .from("ad_campaigns")
      .select("*")
      .in("status", ["budget_held", "paused"])
      .order("created_at", { ascending: true })
      .limit(200);

    if (error) {
      throw error;
    }

    const campaigns = (data || []).map((item) => {
      const budget = Number(item.budget || 0);
      const spent = Number(item.spent_budget || 0);
      const remaining = Number(item.remaining_budget || budget - spent);

      return {
        ...item,
        review_score: Number(
          (
            budget * 0.05 +
            remaining * 0.03 +
            (item.status === "budget_held" ? 15 : 5)
          ).toFixed(2),
        ),
      };
    });

    campaigns.sort((a, b) => b.review_score - a.review_score);

    return {
      success: true,
      campaignReviewQueue: {
        total: campaigns.length,
        queue: campaigns,
      },
    };
  }
}
