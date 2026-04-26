import { Injectable } from "@nestjs/common";
import { SupabaseService } from "../../shared/services/supabase.service";

@Injectable()
export class AdsAdminService {
  constructor(private readonly supabase: SupabaseService) {}

  async dashboard() {
    const { data, error } = await this.supabase
      .getClient()
      .from("ad_campaigns")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(200);

    if (error) {
      throw error;
    }

    const campaigns = data || [];

    const statusCounts = campaigns.reduce<Record<string, number>>((acc, row) => {
      const key = String(row.status || "unknown");
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});

    const totals = campaigns.reduce(
      (acc, row) => {
        acc.budget += Number(row.budget || 0);
        acc.spent += Number(row.spent_budget || 0);
        acc.remaining += Number(row.remaining_budget || 0);
        return acc;
      },
      { budget: 0, spent: 0, remaining: 0 },
    );

    return {
      success: true,
      adsAdmin: {
        totalCampaigns: campaigns.length,
        statusCounts,
        totals,
        recentCampaigns: campaigns.slice(0, 25),
      },
    };
  }
}
