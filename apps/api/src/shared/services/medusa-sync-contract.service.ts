import { Injectable } from "@nestjs/common";

@Injectable()
export class MedusaSyncContractService {
  build() {
    return {
      success: true,
      medusaSyncContract: {
        domains: {
          products: {
            sourceOfTruth: "medusa",
            mirroredInto: "nestjs_commerce_product_sync",
            allowedFields: [
              "id",
              "handle",
              "title",
              "subtitle",
              "status",
              "thumbnail",
              "collection_id",
              "type_id",
              "metadata",
            ],
          },
          variants: {
            sourceOfTruth: "medusa",
            mirroredInto: "nestjs_commerce_variant_sync",
            allowedFields: [
              "id",
              "product_id",
              "title",
              "sku",
              "inventory_quantity",
              "allow_backorder",
              "manage_inventory",
              "prices",
              "metadata",
            ],
          },
          fulfillments: {
            sourceOfTruth: "medusa",
            mirroredInto: "nestjs_commerce_fulfillment_sync",
            allowedFields: [
              "fulfillment_id",
              "order_id",
              "provider_id",
              "fulfillment_status",
              "tracking_numbers",
              "metadata",
            ],
          },
        },
        prohibitedEconomicLogicInMedusa: [
          "wallet_updates",
          "payout_decisions",
          "affiliate_commission_logic",
          "supplier_settlement_logic",
          "ad_budget_holds",
          "watch_reward_authorization",
        ],
      },
    };
  }
}
