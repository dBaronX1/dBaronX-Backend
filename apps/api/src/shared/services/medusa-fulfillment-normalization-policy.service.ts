import { Injectable } from "@nestjs/common";

@Injectable()
export class MedusaFulfillmentNormalizationPolicyService {
  build() {
    return {
      success: true,
      medusaFulfillmentNormalizationPolicy: {
        providerNormalization: {
          manual: "manual",
          shippo: "shippo",
          sendcloud: "sendcloud",
          custom: "custom",
          unknown: "unknown",
        },
        statusNormalization: {
          not_fulfilled: "pending",
          partially_fulfilled: "partial",
          fulfilled: "fulfilled",
          shipped: "fulfilled",
          delivered: "delivered_or_shipped",
          canceled: "cancelled",
        },
        rules: [
          "Preserve raw provider_id from Medusa for audit visibility",
          "Expose normalized provider code for frontend and ops use",
          "Do not derive wallet or payout consequences from fulfillment normalization",
        ],
      },
    };
  }
}
