import { Injectable } from "@nestjs/common";
import { MedusaHttpService } from "./medusa-http.service";
import { CommerceFulfillmentSyncRecord } from "../contracts/commerce-fulfillment.contract";

@Injectable()
export class MedusaFulfillmentBridgeService {
  constructor(private readonly medusaHttp: MedusaHttpService) {}

  async getOrderFulfillments(
    medusaOrderId: string,
    requestId?: string,
  ): Promise<CommerceFulfillmentSyncRecord[]> {
    const response = await this.medusaHttp.get<{
      order?: {
        id: string;
        fulfillments?: Array<Record<string, unknown>>;
      };
    }>(
      `/admin/orders/${medusaOrderId}`,
      {
        "x-request-id": requestId,
        "x-caller-surface": "fulfillment-sync",
      },
      "admin",
    );

    const fulfillments = response.order?.fulfillments || [];

    return fulfillments.map((item) => ({
      medusaOrderId,
      fulfillmentId: String(item.id || ""),
      fulfillmentStatus: String(item.shipped_at ? "fulfilled" : "pending"),
      trackingNumbers: Array.isArray(item.tracking_links)
        ? item.tracking_links
            .map((link) =>
              typeof link === "object" && link
                ? String((link as Record<string, unknown>).tracking_number || "")
                : "",
            )
            .filter(Boolean)
        : [],
      providerId:
        typeof item.provider_id === "string" ? item.provider_id : null,
      metadata:
        typeof item.metadata === "object" && item.metadata
          ? (item.metadata as Record<string, unknown>)
          : {},
    }));
  }
}
