import { Injectable } from "@nestjs/common";
import { MedusaBoundaryPolicyService } from "../../shared/services/medusa-boundary-policy.service";

@Injectable()
export class CommerceBoundaryAuditService {
  constructor(
    private readonly medusaBoundaryPolicy: MedusaBoundaryPolicyService,
  ) {}

  build() {
    const policy = this.medusaBoundaryPolicy.build().medusaBoundaryPolicy;

    const violations = policy.rules.flatMap((rule) =>
      rule.prohibitedInMedusa.map((item) => ({
        domain: rule.domain,
        owner: rule.owner,
        prohibitedInMedusa: item,
      })),
    );

    return {
      success: true,
      commerceBoundaryAudit: {
        enforced: policy.enforced,
        ruleCount: policy.rules.length,
        protectedEconomicDomains: policy.rules
          .filter((rule) => rule.owner === "nestjs")
          .map((rule) => rule.domain),
        medusaProhibitedCapabilities: violations,
      },
    };
  }
}
