import { Injectable } from "@nestjs/common";
import { SupabaseService } from "../../shared/services/supabase.service";

@Injectable()
export class SupplierAdminService {
  constructor(private readonly supabase: SupabaseService) {}

  async dashboard() {
    const [ordersResult, settlementsResult] = await Promise.all([
      this.supabase
        .getClient()
        .from("supplier_orders")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100),
      this.supabase
        .getClient()
        .from("supplier_orders")
        .select("status, settlement_status"),
    ]);

    if (ordersResult.error) {
      throw ordersResult.error;
    }

    if (settlementsResult.error) {
      throw settlementsResult.error;
    }

    const orders = ordersResult.data || [];
    const settlementRows = settlementsResult.data || [];

    const statusCounts = orders.reduce<Record<string, number>>((acc, row) => {
      const key = String(row.status || "unknown");
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});

    const settlementCounts = settlementRows.reduce<Record<string, number>>(
      (acc, row) => {
        const key = String(row.settlement_status || "unsettled");
        acc[key] = (acc[key] || 0) + 1;
        return acc;
      },
      {},
    );

    return {
      success: true,
      supplierAdmin: {
        totalOrders: orders.length,
        statusCounts,
        settlementCounts,
        recentOrders: orders.slice(0, 20),
      },
    };
  }
}
