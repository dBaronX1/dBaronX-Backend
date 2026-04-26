import { Injectable } from "@nestjs/common";
import { SystemCanonicalCompletionService } from "./system-canonical-completion.service";
import { SystemFinalIntegrationVerificationService } from "./system-final-integration-verification.service";
import { SystemFinalLaunchClosureService } from "../../shared/services/system-final-launch-closure.service";
import { SystemFinalReleasePackService } from "../../shared/services/system-final-release-pack.service";
import { CommerceFinalClosureReadinessService } from "../commerce/commerce-final-closure-readiness.service";

@Injectable()
export class SystemFinalizationReadinessService {
  constructor(
    private readonly canonicalCompletion: SystemCanonicalCompletionService,
    private readonly finalIntegrationVerification: SystemFinalIntegrationVerificationService,
    private readonly finalLaunchClosure: SystemFinalLaunchClosureService,
    private readonly finalReleasePack: SystemFinalReleasePackService,
    private readonly commerceFinalClosureReadiness: CommerceFinalClosureReadinessService,
  ) {}

  async build(requestId?: string) {
    const canonical = await this.canonicalCompletion.build(requestId);
    const integration = await this.finalIntegrationVerification.build(requestId);
    const launch = await this.finalLaunchClosure.build(requestId);
    const releasePack = await this.finalReleasePack.build(requestId);
    const commerce = this.commerceFinalClosureReadiness.build();

    const checks = {
      canonicalCompletionClosed: canonical.canonicalCompletion.closed === true,
      finalIntegrationVerificationClosed:
        integration.finalIntegrationVerification.closed === true,
      finalLaunchClosureClosed: launch.finalLaunchClosure.closed === true,
      finalReleasePackPresent: Boolean(releasePack.finalReleasePack),
      commerceFinalClosureClosed:
        commerce.commerceFinalClosureReadiness.closed === true,
    };

    const blockers = Object.entries(checks)
      .filter(([, value]) => value !== true)
      .map(([key]) => key);

    return {
      success: true,
      finalizationReadiness: {
        closed: blockers.length === 0,
        checks,
        blockers,
        requestId: requestId ?? null,
        note:
          "This confirms the remaining closure packs are integrated, retrievable, and consistent through the canonical NestJS shell.",
      },
    };
  }
}
