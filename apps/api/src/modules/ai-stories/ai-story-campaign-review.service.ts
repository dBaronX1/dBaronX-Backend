import { Injectable } from "@nestjs/common";
import { SupabaseService } from "../../shared/services/supabase.service";

@Injectable()
export class AiStoryCampaignReviewService {
  constructor(private readonly supabase: SupabaseService) {}

  async queue() {
    const { data, error } = await this.supabase
      .getClient()
      .from("ai_story_campaigns")
      .select("*")
      .in("status", ["budget_held", "review", "scheduled"])
      .order("created_at", { ascending: true })
      .limit(200);

    if (error) {
      throw error;
    }

    const campaigns = (data || []).map((item) => {
      const spend = Number(item.proposed_spend_amount || 0);
      const score =
        spend * 0.06 + (item.status === "review" ? 20 : item.status === "scheduled" ? 8 : 12);

      return {
        ...item,
        review_score: Number(score.toFixed(2)),
      };
    });

    campaigns.sort((a, b) => b.review_score - a.review_score);

    return {
      success: true,
      aiStoryCampaignReviewQueue: {
        total: campaigns.length,
        queue: campaigns,
      },
    };
  }
}
