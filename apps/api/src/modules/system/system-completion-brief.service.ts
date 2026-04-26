import { Injectable } from "@nestjs/common";
import { SystemCanonicalCompletionService } from "./system-canonical-completion.service";
import { SystemFinalVerificationPackService } from "./system-final-verification-pack.service";
import { SystemFrontendClosureConfirmationService } from "./system-frontend-closure-confirmation.service";
import { SystemFinalizationReadinessService } from "./system-finalization-readiness.service";

@Injectable()
export class SystemCompletionBriefService {
  constructor(
    private readonly canonicalCompletion: SystemCanonicalCompletionService,
    private readonly finalVerificationPack: SystemFinalVerificationPackService,
    private readonly frontendClosureConfirmation: SystemFrontendClosureConfirmationService,
    private readonly finalizationReadiness: SystemFinalizationReadinessService,
  ) {}

  async build(requestId?: string) {
    const canonical = await this.canonicalCompletion.build(requestId);
    const verification = await this.finalVerificationPack.build(requestId);
    const frontend = await this.frontendClosureConfirmation.build(requestId);
    const finalization = await this.finalizationReadiness.build(requestId);

    const aligned =
      canonical.canonicalCompletion.closed === true &&
      verification.finalVerificationPack.closed === true &&
      frontend.frontendClosureConfirmation.closed === true &&
      finalization.finalizationReadiness.closed === true;

    const blockers = [
      ...canonical.canonicalCompletion.blockers,
      ...verification.finalVerificationPack.blockers,
      ...frontend.frontendClosureConfirmation.blockers,
      ...finalization.finalizationReadiness.blockers,
    ];

    return {
      success: true,
      completionBrief: {
        aligned,
        blockerCount: blockers.length,
        blockers,
        completionBand: canonical.canonicalCompletion.completionBand,
        nextAction: canonical.canonicalCompletion.nextAction,
        note:
          "This is the final backend brief surface used to summarize whether the remaining closure domains are fully aligned.",
      },
    };
  }
}
