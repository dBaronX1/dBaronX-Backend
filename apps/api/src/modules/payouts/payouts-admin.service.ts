import { Injectable } from "@nestjs/common";
import { SupabaseService } from "../../shared/services/supabase.service";

@Injectable()
export class PayoutsAdminService {
  constructor(private readonly supabase: SupabaseService) {}

  async dashboard() {
    const { data, error } = await this.supabase
      .getClient()
      .from("payout_requests")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(200);

    if (error) {
      throw error;
    }

    const payouts = data || [];

    const statusCounts = payouts.reduce<Record<string, number>>((acc, row) => {
      const key = String(row.status || "unknown");
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});

    const totals = payouts.reduce(
      (acc, row) => {
        const amount = Number(row.amount || 0);
        acc.totalRequested += amount;
        if (row.status === "settled") acc.totalSettled += amount;
        if (row.status === "rejected") acc.totalRejected += amount;
        return acc;
      },
      { totalRequested: 0, totalSettled: 0, totalRejected: 0 },
    );

    return {
      success: true,
      payoutsAdmin: {
        totalPayoutRequests: payouts.length,
        statusCounts,
        totals,
        recentPayoutRequests: payouts.slice(0, 25),
      },
    };
  }
}
