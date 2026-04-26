import { Injectable } from "@nestjs/common";

@Injectable()
export class MedusaReconciliationProofService {
  build() {
    return {
      success: true,
      medusaReconciliationProof: {
        reconciliationOwnership: {
          orderReconciliation: "nestjs",
          fulfillmentReconciliation: "nestjs",
          settlementReconciliation: "nestjs",
          providerNormalization: "nestjs",
          auditVisibility: "nestjs",
        },
        medusaRole: {
          orderStorage: true,
          fulfillmentStorage: true,
          reconciliationDecisionEngine: false,
          settlementOwnership: false,
          payoutOwnership: false,
          walletOwnership: false,
        },
        rules: [
          "Medusa order data may be mirrored into NestJS reconciliation records",
          "Reconciliation mismatches are resolved by NestJS policy, not Medusa",
          "Settlement consequences are computed by NestJS only",
          "Frontend must treat Medusa as raw commerce state, not economic authority",
        ],
      },
    };
  }
}
