import { Injectable } from "@nestjs/common";
import { MedusaBridgeService } from "../../shared/services/medusa-bridge.service";
import { SupabaseService } from "../../shared/services/supabase.service";

@Injectable()
export class CommerceAdminService {
  constructor(
    private readonly supabase: SupabaseService,
    private readonly medusaBridge: MedusaBridgeService,
  ) {}

  async dashboard() {
    const [
      orderSyncResult,
      productSyncResult,
      variantSyncResult,
      fulfillmentSyncResult,
      settlementResult,
    ] = await Promise.all([
      this.supabase
        .getClient()
        .from("commerce_order_sync")
        .select("*")
        .order("updated_at", { ascending: false })
        .limit(200),
      this.supabase
        .getClient()
        .from("commerce_product_sync")
        .select("*")
        .order("updated_at", { ascending: false })
        .limit(200),
      this.supabase
        .getClient()
        .from("commerce_variant_sync")
        .select("*")
        .order("updated_at", { ascending: false })
        .limit(200),
      this.supabase
        .getClient()
        .from("commerce_fulfillment_sync")
        .select("*")
        .order("updated_at", { ascending: false })
        .limit(200),
      this.supabase
        .getClient()
        .from("commerce_settlements")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(200),
    ]);

    if (orderSyncResult.error) throw orderSyncResult.error;
    if (productSyncResult.error) throw productSyncResult.error;
    if (variantSyncResult.error) throw variantSyncResult.error;
    if (fulfillmentSyncResult.error) throw fulfillmentSyncResult.error;
    if (settlementResult.error) throw settlementResult.error;

    const settlements = settlementResult.data || [];

    const persistedVariants = variantSyncResult.data || [];
    const persistedProducts = productSyncResult.data || [];
    let mirroredVariants = persistedVariants;
    let degradedReason: string | null = null;

    if (!persistedVariants.length && persistedProducts.length) {
      const products = await this.medusaBridge.listProducts();
      mirroredVariants = products.flatMap((product) => {
        const variants = Array.isArray((product as { variants?: unknown[] }).variants)
          ? ((product as { variants?: Record<string, unknown>[] }).variants || [])
          : [];
        return variants.map((variant) => ({
          medusa_variant_id: String(variant.id || ""),
          medusa_product_id: String((product as { id?: string }).id || ""),
          title: variant.title || null,
          sku: variant.sku || null,
          prices: Array.isArray(variant.prices) ? variant.prices : [],
          manage_inventory: variant.manage_inventory ?? null,
          inventory_quantity: variant.inventory_quantity ?? null,
          metadata: variant.metadata || {},
        }));
      });

      if (!mirroredVariants.length) {
        degradedReason = "products visible but variants not synced";
      }
    }

    const totals = settlements.reduce(
      (acc, item) => {
        acc.gross += Number(item.gross_amount || 0);
        acc.supplierCost += Number(item.supplier_cost || 0);
        acc.affiliateCommission += Number(item.affiliate_commission || 0);
        acc.merchantNet += Number(item.merchant_net || 0);
        return acc;
      },
      {
        gross: 0,
        supplierCost: 0,
        affiliateCommission: 0,
        merchantNet: 0,
      },
    );

    return {
      success: true,
      commerceAdmin: {
        orderSyncCount: (orderSyncResult.data || []).length,
        productSyncCount: persistedProducts.length,
        variantSyncCount: mirroredVariants.length,
        fulfillmentSyncCount: (fulfillmentSyncResult.data || []).length,
        settlementCount: settlements.length,
        settlementTotals: totals,
        recentOrders: (orderSyncResult.data || []).slice(0, 25),
        recentProducts: persistedProducts.slice(0, 25),
        recentVariants: mirroredVariants.slice(0, 25),
        degradedReason,
        recentFulfillments: (fulfillmentSyncResult.data || []).slice(0, 25),
        recentSettlements: settlements.slice(0, 25),
      },
    };
  }
}
