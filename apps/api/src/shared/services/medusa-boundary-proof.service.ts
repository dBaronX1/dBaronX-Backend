import { Injectable } from "@nestjs/common";

@Injectable()
export class MedusaBoundaryProofService {
  build() {
    return {
      success: true,
      medusaBoundaryProof: {
        allowedResponsibilities: [
          "product_catalog_storage",
          "variant_storage",
          "inventory_tracking",
          "order_storage",
          "fulfillment_storage",
          "shipping_provider_integration",
        ],
        forbiddenResponsibilities: [
          "wallet_balance_updates",
          "ledger_entry_creation",
          "affiliate_commission_allocation",
          "ad_campaign_budget_holds",
          "watch_reward_approval",
          "supplier_settlement_distribution",
          "payout_approval_or_settlement",
        ],
        proofStatements: [
          "Economic consequences are executed by NestJS only",
          "Risk and intelligence decisions are executed by FastAPI only",
          "Medusa remains a commerce-only plugin layer",
          "Frontend may inspect commerce contracts but must not infer economic ownership into Medusa",
        ],
      },
    };
  }
}
