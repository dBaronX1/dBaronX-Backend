import { Injectable } from "@nestjs/common";
import { IntelligenceAuditPipelineService } from "../../shared/services/intelligence-audit-pipeline.service";
import { LaunchReadinessPersistenceService } from "../../shared/services/launch-readiness-persistence.service";
import { MedusaFulfillmentBridgeService } from "../../shared/services/medusa-fulfillment-bridge.service";
import { SupabaseService } from "../../shared/services/supabase.service";

@Injectable()
export class CommerceFulfillmentSyncService {
  constructor(
    private readonly supabase: SupabaseService,
    private readonly medusaFulfillmentBridge: MedusaFulfillmentBridgeService,
    private readonly intelligenceAudit: IntelligenceAuditPipelineService,
    private readonly launchReadinessPersistence: LaunchReadinessPersistenceService,
  ) {}

  async sync(medusaOrderId: string, requestId?: string) {
    const fulfillments = await this.medusaFulfillmentBridge.getOrderFulfillments(
      medusaOrderId,
      requestId,
    );

    const { data, error } = await this.supabase
      .getClient()
      .from("commerce_fulfillment_sync")
      .upsert(
        fulfillments.map((item) => ({
          medusa_order_id: item.medusaOrderId,
          fulfillment_id: item.fulfillmentId,
          fulfillment_status: item.fulfillmentStatus,
          tracking_numbers: item.trackingNumbers,
          provider_id: item.providerId,
          metadata: item.metadata || {},
          updated_at: new Date().toISOString(),
        })),
        {
          onConflict: "fulfillment_id",
        },
      )
      .select("*");

    if (error) {
      throw error;
    }

    await this.intelligenceAudit.persistDecisionAudit({
      requestId,
      flowType: "commerce_fulfillment_sync",
      routePath: "/api/v1/commerce/fulfillment/sync",
      method: "POST",
      requestPayload: { medusaOrderId },
      decisionPayload: { fulfillments },
      metadata: {
        syncedCount: fulfillments.length,
      },
      tags: ["commerce", "fulfillment", "sync"],
    });

    await this.launchReadinessPersistence.persist({
      requestId,
      source: "commerce-fulfillment-sync",
      status: "ready",
      payload: {
        medusaOrderId,
        syncedCount: fulfillments.length,
      },
    });

    return {
      success: true,
      fulfillmentSync: {
        medusaOrderId,
        syncedCount: fulfillments.length,
        fulfillments: data || [],
      },
    };
  }
}
