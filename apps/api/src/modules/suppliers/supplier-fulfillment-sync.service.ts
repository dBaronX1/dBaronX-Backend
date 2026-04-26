import { Injectable } from "@nestjs/common";
import { IntelligenceAuditPipelineService } from "../../shared/services/intelligence-audit-pipeline.service";
import { MedusaFulfillmentBridgeService } from "../../shared/services/medusa-fulfillment-bridge.service";
import { SupabaseService } from "../../shared/services/supabase.service";

@Injectable()
export class SupplierFulfillmentSyncService {
  constructor(
    private readonly supabase: SupabaseService,
    private readonly medusaFulfillmentBridge: MedusaFulfillmentBridgeService,
    private readonly intelligenceAudit: IntelligenceAuditPipelineService,
  ) {}

  async syncFromMedusa(medusaOrderId: string, requestId?: string) {
    const fulfillments = await this.medusaFulfillmentBridge.getOrderFulfillments(
      medusaOrderId,
      requestId,
    );

    const { data: supplierOrders, error: orderError } = await this.supabase
      .getClient()
      .from("supplier_orders")
      .select("*")
      .eq("medusa_order_id", medusaOrderId);

    if (orderError) {
      throw orderError;
    }

    const orders = supplierOrders || [];

    const updatedOrders = [];
    for (const order of orders) {
      const bestFulfillment = fulfillments[0] || null;

      const nextStatus =
        bestFulfillment?.fulfillmentStatus === "fulfilled"
          ? "shipped"
          : String(order.status || "processing");

      const { data, error } = await this.supabase
        .getClient()
        .from("supplier_orders")
        .update({
          status: nextStatus,
          tracking_number: bestFulfillment?.trackingNumbers?.[0] || null,
          carrier: bestFulfillment?.providerId || null,
          metadata: {
            ...(order.metadata || {}),
            medusaFulfillmentSync: {
              syncedAt: new Date().toISOString(),
              fulfillmentId: bestFulfillment?.fulfillmentId || null,
              fulfillmentStatus: bestFulfillment?.fulfillmentStatus || null,
            },
          },
          updated_at: new Date().toISOString(),
        })
        .eq("id", order.id)
        .select("*")
        .single();

      if (error) {
        throw error;
      }

      updatedOrders.push(data);
    }

    await this.intelligenceAudit.persistDecisionAudit({
      requestId,
      flowType: "supplier_fulfillment_sync",
      routePath: "/api/v1/suppliers/fulfillment-sync",
      method: "POST",
      requestPayload: { medusaOrderId },
      decisionPayload: {
        fulfillments,
        updatedOrders,
      },
      metadata: {
        syncedOrderCount: updatedOrders.length,
      },
      tags: ["suppliers", "fulfillment", "sync"],
    });

    return {
      success: true,
      supplierFulfillmentSync: {
        medusaOrderId,
        syncedOrderCount: updatedOrders.length,
        fulfillments,
        supplierOrders: updatedOrders,
      },
    };
  }
}
