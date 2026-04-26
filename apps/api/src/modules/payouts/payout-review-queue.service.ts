import { Injectable } from "@nestjs/common";
import { SupabaseService } from "../../shared/services/supabase.service";

@Injectable()
export class PayoutReviewQueueService {
  constructor(private readonly supabase: SupabaseService) {}

  async snapshot() {
    const { data, error } = await this.supabase
      .getClient()
      .from("payout_requests")
      .select("*")
      .in("status", ["held_for_review", "approved"])
      .order("created_at", { ascending: true })
      .limit(200);

    if (error) {
      throw error;
    }

    const queue = data || [];

    const priorityQueue = queue
      .map((item) => {
        const amount = Number(item.amount || 0);
        const ageMs =
          Date.now() - new Date(item.created_at || Date.now()).getTime();

        const priorityScore =
          amount * 0.4 +
          Math.min(ageMs / (1000 * 60 * 60), 72) * 0.2 +
          (item.status === "approved" ? 10 : 0);

        return {
          ...item,
          priority_score: Number(priorityScore.toFixed(2)),
        };
      })
      .sort((a, b) => b.priority_score - a.priority_score);

    return {
      success: true,
      payoutReviewQueue: {
        total: priorityQueue.length,
        queue: priorityQueue,
      },
    };
  }
}
