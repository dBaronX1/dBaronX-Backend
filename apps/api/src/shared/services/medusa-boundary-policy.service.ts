import { Injectable } from "@nestjs/common";
import { CommerceBridgeBoundaryRule } from "../contracts/commerce-fulfillment.contract";

@Injectable()
export class MedusaBoundaryPolicyService {
  /**
   * Canonical commerce-boundary contract.
   * Medusa remains commerce-only. All economic, payout, fraud, affiliate,
   * wallet, campaign, and business-orchestration logic stays in NestJS.
   */
  rules(): CommerceBridgeBoundaryRule[] {
    return [
      {
        domain: "catalog",
        owner: "medusa",
        prohibitedInMedusa: [
          "affiliate commissions",
          "watch-to-earn rewards",
          "wallet balance logic",
          "campaign budgets",
          "fraud policy ownership",
        ],
        prohibitedInNestjs: [
          "core product storage ownership",
          "variant pricing source of truth",
        ],
      },
      {
        domain: "orders",
        owner: "medusa",
        prohibitedInMedusa: [
          "economic settlement brain",
          "affiliate payout decisions",
          "supplier payout decisions",
          "internal launch gating",
        ],
        prohibitedInNestjs: [
          "replacing Medusa order persistence",
        ],
      },
      {
        domain: "fulfillment",
        owner: "medusa",
        prohibitedInMedusa: [
          "wallet debit-credit operations",
          "affiliate distribution math",
          "platform treasury accounting",
        ],
        prohibitedInNestjs: [
          "replacing fulfillment provider state",
        ],
      },
      {
        domain: "economics",
        owner: "nestjs",
        prohibitedInMedusa: [
          "ledger",
          "wallet holds",
          "wallet settlements",
          "payout lifecycle",
          "affiliate economics",
          "watch-to-earn economics",
          "AI Stories promotion economics",
        ],
        prohibitedInNestjs: [],
      },
    ];
  }

  build() {
    const rules = this.rules();

    return {
      success: true,
      medusaBoundaryPolicy: {
        enforced: true,
        rules,
      },
    };
  }
}
