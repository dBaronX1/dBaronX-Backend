import { Injectable } from "@nestjs/common";
import { MedusaBoundaryProofService } from "../../shared/services/medusa-boundary-proof.service";
import { MedusaFinalClosurePackService } from "../../shared/services/medusa-final-closure-pack.service";
import { MedusaReconciliationProofService } from "../../shared/services/medusa-reconciliation-proof.service";
import { MedusaSyncContractService } from "../../shared/services/medusa-sync-contract.service";
import { MedusaFulfillmentNormalizationPolicyService } from "../../shared/services/medusa-fulfillment-normalization-policy.service";

@Injectable()
export class CommerceFinalClosureReadinessService {
  constructor(
    private readonly boundaryProof: MedusaBoundaryProofService,
    private readonly reconciliationProof: MedusaReconciliationProofService,
    private readonly syncContract: MedusaSyncContractService,
    private readonly normalization: MedusaFulfillmentNormalizationPolicyService,
    private readonly finalClosurePack: MedusaFinalClosurePackService,
  ) {}

  build() {
    const boundary = this.boundaryProof.build().medusaBoundaryProof;
    const reconciliation =
      this.reconciliationProof.build().medusaReconciliationProof;
    const contract = this.syncContract.build().medusaSyncContract;
    const normalization =
      this.normalization.build().medusaFulfillmentNormalizationPolicy;
    const pack = this.finalClosurePack.build().medusaFinalClosurePack;

    const checks = {
      boundaryProofPresent: boundary.forbiddenResponsibilities.length > 0,
      reconciliationProofPresent:
        Object.values(reconciliation.reconciliationOwnership).every(
          (value) => value === "nestjs",
        ),
      syncContractPresent: contract.prohibitedEconomicLogicInMedusa.length > 0,
      normalizationPolicyPresent: normalization.rules.length > 0,
      finalClosurePackClosed: pack.closed === true,
    };

    const blockers = Object.entries(checks)
      .filter(([, value]) => value !== true)
      .map(([key]) => key);

    return {
      success: true,
      commerceFinalClosureReadiness: {
        closed: blockers.length === 0,
        checks,
        blockers,
        nextAction:
          blockers.length === 0
            ? "medusa_closure_confirmed"
            : "complete_remaining_medusa_closure_checks",
      },
    };
  }
}
