import { Injectable } from "@nestjs/common";
import { SystemLaunchClosureService } from "./system-launch-closure.service";
import { SystemReadinessMatrixService } from "./system-readiness-matrix.service";

@Injectable()
export class SystemRunbookPackService {
  constructor(
    private readonly launchClosure: SystemLaunchClosureService,
    private readonly readinessMatrix: SystemReadinessMatrixService,
  ) {}

  async build(requestId?: string) {
    const [closure, readiness] = await Promise.all([
      this.launchClosure.build(requestId),
      this.readinessMatrix.build(requestId),
    ]);

    return {
      success: true,
      runbookPack: {
        launchClosure: closure.launchClosure,
        readinessMatrix: readiness.readinessMatrix,
        runbooks: {
          payouts: {
            reviewQueue: "/api/v1/payouts/review-queue",
            approve: "/api/v1/payouts/:payoutRequestId/approve",
            reject: "/api/v1/payouts/:payoutRequestId/reject",
            settle: "/api/v1/payouts/:payoutRequestId/settle",
          },
          suppliers: {
            create: "/api/v1/suppliers/orders",
            lifecycle: "/api/v1/suppliers/orders/status",
            settle: "/api/v1/suppliers/orders/settle",
            fulfillmentSync: "/api/v1/suppliers/fulfillment/:medusaOrderId/sync",
          },
          ads: {
            create: "/api/v1/ads/campaigns",
            lifecycle: "/api/v1/ads/campaigns/status",
            spend: "/api/v1/ads/campaigns/spend",
            reviewQueue: "/api/v1/ads/review/queue",
          },
          aiStories: {
            createCampaign: "/api/v1/ai-stories/campaigns",
            lifecycle: "/api/v1/ai-stories/campaigns/status",
            schedule: "/api/v1/ai-stories/campaigns/schedule",
            reviewQueue: "/api/v1/ai-stories/review/queue",
            distributionPack: "/api/v1/ai-stories/distribution-pack/:campaignId",
          },
          commerce: {
            settlement: "/api/v1/commerce/settlements",
            reconciliation: "/api/v1/commerce/reconciliation/orders/:medusaOrderId",
            fulfillmentSync: "/api/v1/commerce/fulfillment/:medusaOrderId/sync",
            providerNormalization:
              "/api/v1/commerce/fulfillment/:medusaOrderId/provider-normalization",
          },
        },
      },
    };
  }
}
