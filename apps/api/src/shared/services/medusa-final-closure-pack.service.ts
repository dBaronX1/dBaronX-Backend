import { Injectable } from "@nestjs/common";
import { MedusaBoundaryProofService } from "./medusa-boundary-proof.service";
import { MedusaReconciliationProofService } from "./medusa-reconciliation-proof.service";
import { MedusaSyncContractService } from "./medusa-sync-contract.service";
import { MedusaFulfillmentNormalizationPolicyService } from "./medusa-fulfillment-normalization-policy.service";

@Injectable()
export class MedusaFinalClosurePackService {
  constructor(
    private readonly boundaryProof: MedusaBoundaryProofService,
    private readonly reconciliationProof: MedusaReconciliationProofService,
    private readonly syncContract: MedusaSyncContractService,
    private readonly normalizationPolicy: MedusaFulfillmentNormalizationPolicyService,
  ) {}

  build() {
    const boundary = this.boundaryProof.build().medusaBoundaryProof;
    const reconciliation =
      this.reconciliationProof.build().medusaReconciliationProof;
    const contract = this.syncContract.build().medusaSyncContract;
    const normalization =
      this.normalizationPolicy.build().medusaFulfillmentNormalizationPolicy;

    const closed =
      boundary.forbiddenResponsibilities.length > 0 &&
      contract.prohibitedEconomicLogicInMedusa.length > 0 &&
      Object.values(reconciliation.reconciliationOwnership).every(
        (value) => value === "nestjs",
      );

    return {
      success: true,
      medusaFinalClosurePack: {
        closed,
        boundary,
        reconciliation,
        contract,
        normalization,
      },
    };
  }
}
