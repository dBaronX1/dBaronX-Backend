import { Injectable } from "@nestjs/common";
import { CommerceHealthService } from "../commerce/commerce-health.service";
import { EnvironmentContractService } from "../../shared/services/environment-contract.service";
import { LaunchGateService } from "../../shared/services/launch-gate.service";
import { MedusaBoundaryPolicyService } from "../../shared/services/medusa-boundary-policy.service";
import { SystemStartupSequenceService } from "../../shared/services/system-startup-sequence.service";

@Injectable()
export class SystemClosureService {
  constructor(
    private readonly environmentContract: EnvironmentContractService,
    private readonly startupSequence: SystemStartupSequenceService,
    private readonly launchGate: LaunchGateService,
    private readonly commerceHealth: CommerceHealthService,
    private readonly medusaBoundaryPolicy: MedusaBoundaryPolicyService,
  ) {}

  async snapshot(requestId?: string) {
    const [environment, startup, commerce] = await Promise.all([
      Promise.resolve(this.environmentContract.build().environmentContract),
      this.startupSequence.build(requestId),
      this.commerceHealth.snapshot(requestId),
    ]);

    const gate = this.launchGate.snapshot().launchGate;
    const boundary = this.medusaBoundaryPolicy.build().medusaBoundaryPolicy;

    const closed =
      environment.valid &&
      startup.startupSequence.ready &&
      gate.ready &&
      commerce.commerceHealth.status === "ready" &&
      boundary.enforced;

    const blockers = [
      ...(!environment.valid ? environment.missing.map((v) => `env:${v}`) : []),
      ...(!startup.startupSequence.ready ? startup.startupSequence.blockers : []),
      ...(!gate.ready ? gate.blockers : []),
      ...(commerce.commerceHealth.status !== "ready"
        ? ["commerce_health_degraded"]
        : []),
      ...(!boundary.enforced ? ["medusa_boundary_not_enforced"] : []),
    ];

    return {
      success: true,
      systemClosure: {
        closed,
        blockers,
        environmentValid: environment.valid,
        startupReady: startup.startupSequence.ready,
        launchGateReady: gate.ready,
        commerceReady: commerce.commerceHealth.status === "ready",
        medusaBoundaryEnforced: boundary.enforced,
      },
    };
  }
}
