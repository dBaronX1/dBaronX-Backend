import { Injectable } from "@nestjs/common";
import { SupabaseService } from "../../shared/services/supabase.service";

@Injectable()
export class AiStoriesAdminService {
  constructor(private readonly supabase: SupabaseService) {}

  async dashboard() {
    const [campaignsResult, storiesResult] = await Promise.all([
      this.supabase
        .getClient()
        .from("ai_story_campaigns")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(200),
      this.supabase
        .getClient()
        .from("ai_stories")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100),
    ]);

    if (campaignsResult.error) {
      throw campaignsResult.error;
    }

    if (storiesResult.error) {
      throw storiesResult.error;
    }

    const campaigns = campaignsResult.data || [];
    const stories = storiesResult.data || [];

    const campaignStatusCounts = campaigns.reduce<Record<string, number>>(
      (acc, row) => {
        const key = String(row.status || "unknown");
        acc[key] = (acc[key] || 0) + 1;
        return acc;
      },
      {},
    );

    return {
      success: true,
      aiStoriesAdmin: {
        totalCampaigns: campaigns.length,
        totalStories: stories.length,
        campaignStatusCounts,
        recentCampaigns: campaigns.slice(0, 20),
        recentStories: stories.slice(0, 20),
      },
    };
  }
}
