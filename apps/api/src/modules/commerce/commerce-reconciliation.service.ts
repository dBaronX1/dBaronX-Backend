import { Injectable } from "@nestjs/common";
import { IntelligenceAuditPipelineService } from "../../shared/services/intelligence-audit-pipeline.service";
import { LaunchReadinessPersistenceService } from "../../shared/services/launch-readiness-persistence.service";
import { MedusaBridgeService } from "../../shared/services/medusa-bridge.service";
import { SupabaseService } from "../../shared/services/supabase.service";
import { MedusaFulfillmentBridgeService } from "../../shared/services/medusa-fulfillment-bridge.service";

@Injectable()
export class CommerceReconciliationService {
  constructor(
    private readonly supabase: SupabaseService,
    private readonly medusaBridge: MedusaBridgeService,
    private readonly medusaFulfillmentBridge: MedusaFulfillmentBridgeService,
    private readonly intelligenceAudit: IntelligenceAuditPipelineService,
    private readonly launchReadinessPersistence: LaunchReadinessPersistenceService,
  ) {}

  async reconcileOrder(medusaOrderId: string, requestId?: string) {
    const [order, fulfillments] = await Promise.all([
      this.medusaBridge.getOrder(medusaOrderId, requestId),
      this.medusaFulfillmentBridge.getOrderFulfillments(medusaOrderId, requestId),
    ]);

    const { data: localOrder, error: localError } = await this.supabase
      .getClient()
      .from("commerce_order_sync")
      .select("*")
      .eq("medusa_order_id", medusaOrderId)
      .maybeSingle();

    if (localError) {
      throw localError;
    }

    const reconciliation = {
      medusaOrderPresent: Boolean(order),
      localOrderPresent: Boolean(localOrder),
      orderStatusMatch:
        Boolean(order) &&
        Boolean(localOrder) &&
        String(order?.status || "") === String(localOrder?.order_status || ""),
      paymentStatusMatch:
        Boolean(order) &&
        Boolean(localOrder) &&
        String(order?.payment_status || "") ===
          String(localOrder?.payment_status || ""),
      fulfillmentStatusMatch:
        Boolean(order) &&
        Boolean(localOrder) &&
        String(order?.fulfillment_status || "") ===
          String(localOrder?.fulfillment_status || ""),
      fulfillmentCount: fulfillments.length,
    };

    await this.intelligenceAudit.persistDecisionAudit({
      requestId,
      flowType: "commerce_order_reconciliation",
      routePath: "/api/v1/commerce/reconciliation/order",
      method: "POST",
      requestPayload: { medusaOrderId },
      decisionPayload: {
        order,
        localOrder,
        fulfillments,
        reconciliation,
      },
      metadata: {
        medusaOrderId,
      },
      tags: ["commerce", "reconciliation", "orders"],
    });

    await this.launchReadinessPersistence.persist({
      requestId,
      source: "commerce-reconciliation",
      status:
        reconciliation.medusaOrderPresent &&
        reconciliation.localOrderPresent &&
        reconciliation.orderStatusMatch &&
        reconciliation.paymentStatusMatch
          ? "ready"
          : "degraded",
      blockers: Object.entries(reconciliation)
        .filter(([, value]) => value === false)
        .map(([key]) => key),
      payload: {
        medusaOrderId,
        reconciliation,
      },
    });

    return {
      success: true,
      reconciliation: {
        medusaOrderId,
        order,
        localOrder,
        fulfillments,
        checks: reconciliation,
      },
    };
  }
}
