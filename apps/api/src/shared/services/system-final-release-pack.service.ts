import { Injectable } from "@nestjs/common";
import { SystemFinalLaunchClosureService } from "./system-final-launch-closure.service";
import { SystemDeploymentReadinessService } from "./system-deployment-readiness.service";
import { SystemStartupGateService } from "./system-startup-gate.service";
import { SystemRuntimeContractService } from "./system-runtime-contract.service";
import { MedusaFinalClosurePackService } from "./medusa-final-closure-pack.service";

@Injectable()
export class SystemFinalReleasePackService {
  constructor(
    private readonly finalLaunchClosure: SystemFinalLaunchClosureService,
    private readonly deploymentReadiness: SystemDeploymentReadinessService,
    private readonly startupGate: SystemStartupGateService,
    private readonly runtimeContract: SystemRuntimeContractService,
    private readonly medusaFinalClosure: MedusaFinalClosurePackService,
  ) {}

  async build(requestId?: string) {
    const launch = await this.finalLaunchClosure.build(requestId);
    const deployment = this.deploymentReadiness.build();
    const startup = this.startupGate.build();
    const runtime = this.runtimeContract.build();
    const medusa = this.medusaFinalClosure.build();

    return {
      success: true,
      finalReleasePack: {
        frontendClosure: {
          source: "frontend_surface",
          note: "Frontend closure is computed and inspected on the frontend release surfaces.",
        },
        finalLaunchClosure: launch.finalLaunchClosure,
        medusaFinalClosure: medusa.medusaFinalClosurePack,
        deploymentReadiness: deployment.deploymentReadiness,
        startupGate: startup.startupGate,
        runtimeContract: runtime.runtimeContract,
      },
    };
  }
}
