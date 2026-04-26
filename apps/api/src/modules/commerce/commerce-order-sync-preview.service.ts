import { Injectable } from "@nestjs/common";
import { LaunchReadinessPersistenceService } from "../../shared/services/launch-readiness-persistence.service";
import { MedusaBridgeService } from "../../shared/services/medusa-bridge.service";
import { SupabaseService } from "../../shared/services/supabase.service";

@Injectable()
export class CommerceOrderSyncPreviewService {
  constructor(
    private readonly medusaBridge: MedusaBridgeService,
    private readonly supabase: SupabaseService,
    private readonly launchReadinessPersistence: LaunchReadinessPersistenceService,
  ) {}

  async preview(medusaOrderId: string, requestId?: string) {
    const medusaOrder = await this.medusaBridge.getOrder(medusaOrderId, requestId);

    const { data: localOrder, error } = await this.supabase
      .getClient()
      .from("commerce_order_sync")
      .select("*")
      .eq("medusa_order_id", medusaOrderId)
      .maybeSingle();

    if (error) {
      throw error;
    }

    const drift = {
      medusaMissing: !medusaOrder,
      localMissing: !localOrder,
      statusMismatch:
        !!medusaOrder &&
        !!localOrder &&
        String(medusaOrder.status || "") !== String(localOrder.order_status || ""),
      paymentStatusMismatch:
        !!medusaOrder &&
        !!localOrder &&
        String(medusaOrder.payment_status || "") !==
          String(localOrder.payment_status || ""),
      fulfillmentStatusMismatch:
        !!medusaOrder &&
        !!localOrder &&
        String(medusaOrder.fulfillment_status || "") !==
          String(localOrder.fulfillment_status || ""),
    };

    await this.launchReadinessPersistence.persist({
      requestId,
      source: "commerce-order-sync-preview",
      status:
        Object.values(drift).some(Boolean) || !medusaOrder ? "degraded" : "ready",
      blockers: Object.entries(drift)
        .filter(([, value]) => value)
        .map(([key]) => key),
      payload: {
        medusaOrderId,
        medusaOrder,
        localOrder,
      },
    });

    return {
      success: true,
      orderSyncPreview: {
        medusaOrderId,
        medusaOrder,
        localOrder,
        drift,
      },
    };
  }
}
