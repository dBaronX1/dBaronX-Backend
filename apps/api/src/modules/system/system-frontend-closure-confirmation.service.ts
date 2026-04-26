import { Injectable } from "@nestjs/common";
import { SystemFinalIntegrationVerificationService } from "./system-final-integration-verification.service";
import { SystemFinalLaunchClosureService } from "../../shared/services/system-final-launch-closure.service";
import { SystemFinalizationReadinessService } from "./system-finalization-readiness.service";

@Injectable()
export class SystemFrontendClosureConfirmationService {
  constructor(
    private readonly finalIntegrationVerification: SystemFinalIntegrationVerificationService,
    private readonly finalLaunchClosure: SystemFinalLaunchClosureService,
    private readonly finalizationReadiness: SystemFinalizationReadinessService,
  ) {}

  async build(requestId?: string) {
    const integration = await this.finalIntegrationVerification.build(requestId);
    const launch = await this.finalLaunchClosure.build(requestId);
    const readiness = await this.finalizationReadiness.build(requestId);

    const checks = {
      finalIntegrationVerificationClosed:
        integration.finalIntegrationVerification.closed === true,
      finalLaunchClosureClosed: launch.finalLaunchClosure.closed === true,
      finalizationReadinessClosed:
        readiness.finalizationReadiness.closed === true,
    };

    const blockers = Object.entries(checks)
      .filter(([, value]) => value !== true)
      .map(([key]) => key);

    return {
      success: true,
      frontendClosureConfirmation: {
        closed: blockers.length === 0,
        checks,
        blockers,
        requestId: requestId ?? null,
        note:
          "Frontend closure confirmation proves the frontend-facing closure surfaces are backed by integrated finalization services through the canonical shell.",
      },
    };
  }
}
