import { Injectable } from "@nestjs/common";
import { SupabaseService } from "../../shared/services/supabase.service";

@Injectable()
export class PaymentsAdminService {
  constructor(private readonly supabase: SupabaseService) {}

  async dashboard() {
    const [preflightsResult, settlementsResult] = await Promise.all([
      this.supabase
        .getClient()
        .from("intelligence_audit_traces")
        .select("*")
        .eq("flow_type", "payment_preflight")
        .order("created_at", { ascending: false })
        .limit(200),
      this.supabase
        .getClient()
        .from("checkout_settlements")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(200),
    ]);

    if (preflightsResult.error) throw preflightsResult.error;
    if (settlementsResult.error) throw settlementsResult.error;

    const preflights = preflightsResult.data || [];
    const settlements = settlementsResult.data || [];

    const settlementTotals = settlements.reduce(
      (acc, row) => {
        acc.gross += Number(row.gross_amount || 0);
        acc.net += Number(row.net_amount || 0);
        acc.tax += Number(row.tax_amount || 0);
        acc.shipping += Number(row.shipping_amount || 0);
        acc.discount += Number(row.discount_amount || 0);
        return acc;
      },
      { gross: 0, net: 0, tax: 0, shipping: 0, discount: 0 },
    );

    return {
      success: true,
      paymentsAdmin: {
        preflightTraceCount: preflights.length,
        checkoutSettlementCount: settlements.length,
        settlementTotals,
        recentPreflights: preflights.slice(0, 25),
        recentSettlements: settlements.slice(0, 25),
      },
    };
  }
}
