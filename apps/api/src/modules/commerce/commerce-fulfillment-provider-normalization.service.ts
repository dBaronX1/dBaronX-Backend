import { Injectable } from "@nestjs/common";
import { MedusaFulfillmentBridgeService } from "../../shared/services/medusa-fulfillment-bridge.service";

@Injectable()
export class CommerceFulfillmentProviderNormalizationService {
  constructor(
    private readonly medusaFulfillmentBridge: MedusaFulfillmentBridgeService,
  ) {}

  async normalize(medusaOrderId: string, requestId?: string) {
    const fulfillments = await this.medusaFulfillmentBridge.getOrderFulfillments(
      medusaOrderId,
      requestId,
    );

    const normalized = fulfillments.map((item) => ({
      fulfillmentId: item.fulfillmentId,
      medusaOrderId: item.medusaOrderId,
      providerCode: (item.providerId || "unknown").toLowerCase(),
      normalizedStatus:
        item.fulfillmentStatus === "fulfilled" ? "delivered_or_shipped" : "pending",
      trackingNumbers: item.trackingNumbers,
      metadata: item.metadata || {},
    }));

    return {
      success: true,
      fulfillmentProviderNormalization: {
        medusaOrderId,
        normalized,
      },
    };
  }
}
