import { Injectable } from "@nestjs/common";
import { SystemFinalIntegrationVerificationService } from "./system-final-integration-verification.service";
import { SystemFinalLaunchClosureService } from "../../shared/services/system-final-launch-closure.service";
import { SystemFinalReleasePackService } from "../../shared/services/system-final-release-pack.service";
import { CommerceFinalClosureReadinessService } from "../commerce/commerce-final-closure-readiness.service";

@Injectable()
export class SystemCanonicalCompletionService {
  constructor(
    private readonly finalIntegrationVerification: SystemFinalIntegrationVerificationService,
    private readonly finalLaunchClosure: SystemFinalLaunchClosureService,
    private readonly finalReleasePack: SystemFinalReleasePackService,
    private readonly commerceFinalClosureReadiness: CommerceFinalClosureReadinessService,
  ) {}

  async build(requestId?: string) {
    const verification = await this.finalIntegrationVerification.build(requestId);
    const launch = await this.finalLaunchClosure.build(requestId);
    const releasePack = await this.finalReleasePack.build(requestId);
    const commerce = this.commerceFinalClosureReadiness.build();

    const checks = {
      integrationVerificationClosed:
        verification.finalIntegrationVerification.closed === true,
      finalLaunchClosureClosed: launch.finalLaunchClosure.closed === true,
      finalReleasePackPresent: Boolean(releasePack.finalReleasePack),
      commerceClosureClosed:
        commerce.commerceFinalClosureReadiness.closed === true,
    };

    const blockers = Object.entries(checks)
      .filter(([, value]) => value !== true)
      .map(([key]) => key);

    return {
      success: true,
      canonicalCompletion: {
        closed: blockers.length === 0,
        checks,
        blockers,
        completionBand:
          blockers.length === 0 ? "complete" : "late_stage_hardening",
        nextAction:
          blockers.length === 0
            ? "issue_canonical_completion_brief"
            : "finish_remaining_closure_checks",
      },
    };
  }
}
