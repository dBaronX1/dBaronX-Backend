import { Injectable } from "@nestjs/common";
import { IntelligenceAuditPipelineService } from "../../shared/services/intelligence-audit-pipeline.service";
import { LaunchReadinessPersistenceService } from "../../shared/services/launch-readiness-persistence.service";
import { MedusaBridgeService } from "../../shared/services/medusa-bridge.service";
import { ManualOrderSyncDto } from "./dto/manual-order-sync.dto";

@Injectable()
export class CommerceOrderBridgeService {
  constructor(
    private readonly medusaBridge: MedusaBridgeService,
    private readonly intelligenceAudit: IntelligenceAuditPipelineService,
    private readonly launchReadinessPersistence: LaunchReadinessPersistenceService,
  ) {}

  async syncOrder(body: ManualOrderSyncDto, requestId?: string) {
    const sync = await this.medusaBridge.syncManualOrder(
      {
        medusaOrderId: body.medusaOrderId,
        customerId: body.customerId,
        affiliateUserId: body.affiliateUserId,
        supplierId: body.supplierId,
        externalReference: body.externalReference,
        syncMode: body.syncMode,
        metadata: body.metadata,
      },
      requestId,
    );

    await this.intelligenceAudit.persistDecisionAudit({
      requestId,
      flowType: "commerce_order_bridge",
      routePath: "/api/v1/commerce/orders/sync",
      method: "POST",
      requestPayload: body as unknown as Record<string, unknown>,
      decisionPayload: sync.medusaOrder as unknown as Record<string, unknown>,
      metadata: {
        syncMode: body.syncMode,
        medusaOrderId: body.medusaOrderId,
      },
      tags: ["commerce", "medusa", "order-sync"],
    });

    await this.launchReadinessPersistence.persist({
      requestId,
      source: "commerce-order-bridge",
      status: sync.medusaOrder ? "ready" : "degraded",
      blockers: sync.medusaOrder ? [] : ["medusa_order_not_found"],
      payload: {
        syncMode: body.syncMode,
        medusaOrderId: body.medusaOrderId,
        medusaOrder: sync.medusaOrder,
      },
    });

    return {
      success: true,
      orderSync: sync,
    };
  }
}
