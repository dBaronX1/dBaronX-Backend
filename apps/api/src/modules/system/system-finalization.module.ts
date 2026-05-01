import { Module } from "@nestjs/common";
import { CommerceModule } from "../commerce/commerce.module";
import { SystemModule } from "./system.module";
import { PlatformModule } from "../platform/platform.module";
import { CommerceBoundaryProofController } from "../commerce/commerce-boundary-proof.controller";
import { CommerceFinalClosureController } from "../commerce/commerce-final-closure.controller";
import { CommerceFinalClosureReadinessController } from "../commerce/commerce-final-closure-readiness.controller";
import { CommerceFinalClosureReadinessService } from "../commerce/commerce-final-closure-readiness.service";
import { CommerceReconciliationProofController } from "../commerce/commerce-reconciliation-proof.controller";
import { CommerceSyncContractController } from "../commerce/commerce-sync-contract.controller";
import { MedusaBoundaryProofService } from "../../shared/services/medusa-boundary-proof.service";
import { MedusaFinalClosurePackService } from "../../shared/services/medusa-final-closure-pack.service";
import { MedusaFulfillmentNormalizationPolicyService } from "../../shared/services/medusa-fulfillment-normalization-policy.service";
import { MedusaReconciliationProofService } from "../../shared/services/medusa-reconciliation-proof.service";
import { MedusaSyncContractService } from "../../shared/services/medusa-sync-contract.service";
import { SystemAppShellWiringController } from "./system-app-shell-wiring.controller";
import { SystemAppShellWiringService } from "./system-app-shell-wiring.service";
import { SystemCanonicalCompletionController } from "./system-canonical-completion.controller";
import { SystemCanonicalCompletionService } from "./system-canonical-completion.service";
import { SystemCompletionBriefController } from "./system-completion-brief.controller";
import { SystemCompletionBriefService } from "./system-completion-brief.service";
import { SystemControllerRegistryController } from "./system-controller-registry.controller";
import { SystemControllerRegistryService } from "./system-controller-registry.service";
import { SystemDeploymentReadinessController } from "./system-deployment-readiness.controller";
import { SystemFinalIntegrationVerificationController } from "./system-final-integration-verification.controller";
import { SystemFinalIntegrationVerificationService } from "./system-final-integration-verification.service";
import { SystemFinalLaunchClosureController } from "./system-final-launch-closure.controller";
import { SystemFinalReleasePackController } from "./system-final-release-pack.controller";
import { SystemFinalVerificationPackController } from "./system-final-verification-pack.controller";
import { SystemFinalVerificationPackService } from "./system-final-verification-pack.service";
import { SystemFinalizationReadinessController } from "./system-finalization-readiness.controller";
import { SystemFinalizationReadinessService } from "./system-finalization-readiness.service";
import { SystemFrontendClosureConfirmationController } from "./system-frontend-closure-confirmation.controller";
import { SystemFrontendClosureConfirmationService } from "./system-frontend-closure-confirmation.service";
import { SystemRuntimeContractController } from "./system-runtime-contract.controller";
import { SystemStartupGateController } from "./system-startup-gate.controller";
import { SystemDeploymentReadinessService } from "../../shared/services/system-deployment-readiness.service";
import { SystemFinalLaunchClosureService } from "../../shared/services/system-final-launch-closure.service";
import { SystemFinalReleasePackService } from "../../shared/services/system-final-release-pack.service";
import { SystemRuntimeContractService } from "../../shared/services/system-runtime-contract.service";
import { SystemStartupGateService } from "../../shared/services/system-startup-gate.service";
import { SystemLaunchClosureService } from "./system-launch-closure.service";
import { SystemShellClosureService } from "./system-shell-closure.service";

@Module({
  imports: [SystemModule, CommerceModule, PlatformModule],
  controllers: [
    CommerceSyncContractController,
    CommerceBoundaryProofController,
    CommerceReconciliationProofController,
    CommerceFinalClosureController,
    CommerceFinalClosureReadinessController,
    SystemStartupGateController,
    SystemRuntimeContractController,
    SystemDeploymentReadinessController,
    SystemFinalLaunchClosureController,
    SystemFinalReleasePackController,
    SystemFinalIntegrationVerificationController,
    SystemCanonicalCompletionController,
    SystemFinalizationReadinessController,
    SystemControllerRegistryController,
    SystemAppShellWiringController,
    SystemFinalVerificationPackController,
    SystemFrontendClosureConfirmationController,
    SystemCompletionBriefController,
  ],
  providers: [
    MedusaSyncContractService,
    MedusaBoundaryProofService,
    MedusaReconciliationProofService,
    MedusaFulfillmentNormalizationPolicyService,
    MedusaFinalClosurePackService,
    CommerceFinalClosureReadinessService,
    SystemStartupGateService,
    SystemRuntimeContractService,
    SystemDeploymentReadinessService,
    SystemLaunchClosureService,
    SystemShellClosureService,
    SystemFinalLaunchClosureService,
    SystemFinalReleasePackService,
    SystemFinalIntegrationVerificationService,
    SystemCanonicalCompletionService,
    SystemFinalizationReadinessService,
    SystemControllerRegistryService,
    SystemAppShellWiringService,
    SystemFinalVerificationPackService,
    SystemFrontendClosureConfirmationService,
    SystemCompletionBriefService,
  ],
  exports: [
    CommerceFinalClosureReadinessService,
    SystemFinalLaunchClosureService,
    SystemFinalReleasePackService,
    SystemFinalIntegrationVerificationService,
    SystemCanonicalCompletionService,
    SystemFinalizationReadinessService,
    SystemControllerRegistryService,
    SystemAppShellWiringService,
    SystemFinalVerificationPackService,
    SystemFrontendClosureConfirmationService,
    SystemCompletionBriefService,
  ],
})
export class SystemFinalizationModule {}
