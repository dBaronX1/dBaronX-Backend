import { Injectable } from "@nestjs/common";
import { SystemFinalLaunchClosureService } from "../../shared/services/system-final-launch-closure.service";
import { SystemFinalReleasePackService } from "../../shared/services/system-final-release-pack.service";
import { SystemRuntimeContractService } from "../../shared/services/system-runtime-contract.service";
import { SystemDeploymentReadinessService } from "../../shared/services/system-deployment-readiness.service";
import { SystemStartupGateService } from "../../shared/services/system-startup-gate.service";
import { CommerceFinalClosureReadinessService } from "../commerce/commerce-final-closure-readiness.service";

@Injectable()
export class SystemFinalIntegrationVerificationService {
  constructor(
    private readonly finalLaunchClosure: SystemFinalLaunchClosureService,
    private readonly finalReleasePack: SystemFinalReleasePackService,
    private readonly runtimeContract: SystemRuntimeContractService,
    private readonly deploymentReadiness: SystemDeploymentReadinessService,
    private readonly startupGate: SystemStartupGateService,
    private readonly commerceFinalClosureReadiness: CommerceFinalClosureReadinessService,
  ) {}

  async build(requestId?: string) {
    const launch = await this.finalLaunchClosure.build(requestId);
    const releasePack = await this.finalReleasePack.build(requestId);
    const runtime = this.runtimeContract.build();
    const deployment = this.deploymentReadiness.build();
    const startup = this.startupGate.build();
    const commerce = this.commerceFinalClosureReadiness.build();

    const checks = {
      finalLaunchClosurePresent: Boolean(launch.finalLaunchClosure),
      finalReleasePackPresent: Boolean(releasePack.finalReleasePack),
      runtimeContractPresent: Boolean(runtime.runtimeContract),
      deploymentReadinessPresent: Boolean(deployment.deploymentReadiness),
      startupGatePresent: Boolean(startup.startupGate),
      commerceClosureConfirmed:
        commerce.commerceFinalClosureReadiness.closed === true,
    };

    const blockers = Object.entries(checks)
      .filter(([, value]) => value !== true)
      .map(([key]) => key);

    return {
      success: true,
      finalIntegrationVerification: {
        closed: blockers.length === 0,
        checks,
        blockers,
        requestId: requestId ?? null,
        note:
          "This verifies final launch-hardening surfaces are integrated and retrievable through the canonical app shell.",
      },
    };
  }
}
