import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { CommerceModule } from "../commerce/commerce.module";
import { AiStoriesModule } from "../ai-stories/ai-stories.module";
import { AffiliateModule } from "../affiliate/affiliate.module";
import { PaymentsModule } from "../payments/payments.module";
import { WatchModule } from "../watch/watch.module";
import { SystemAdminOpsController } from "./system-admin-ops.controller";
import { SystemAdminOpsService } from "./system-admin-ops.service";
import { SystemBootstrapHardeningController } from "./system-bootstrap-hardening.controller";
import { SystemBootstrapHardeningService } from "./system-bootstrap-hardening.service";
import { SystemClosureController } from "./system-closure.controller";
import { SystemClosureService } from "./system-closure.service";
import { SystemCompatibilityController } from "./system-compatibility.controller";
import { SystemCompatibilityService } from "./system-compatibility.service";
import { SystemDeploymentHardeningController } from "./system-deployment-hardening.controller";
import { SystemDeploymentHardeningService } from "./system-deployment-hardening.service";
import { SystemEnvironmentContractController } from "./system-environment-contract.controller";
import { SystemIntelligenceOrchestrationController } from "./system-intelligence-orchestration.controller";
import { SystemIntelligenceOrchestrationService } from "./system-intelligence-orchestration.service";
import { SystemLaunchClosureController } from "./system-launch-closure.controller";
import { SystemLaunchClosureService } from "./system-launch-closure.service";
import { SystemLaunchGateController } from "./system-launch-gate.controller";
import { SystemLaunchGateService } from "./system-launch-gate.service";
import { SystemLaunchReadinessController } from "./system-launch-readiness.controller";
import { SystemLaunchReadinessService } from "./system-launch-readiness.service";
import { SystemOpsController } from "./system-ops.controller";
import { SystemOpsService } from "./system-ops.service";
import { SystemRuntimeStatusController } from "./system-runtime-status.controller";
import { SystemRuntimeStatusService } from "./system-runtime-status.service";
import { SystemStartupSequenceController } from "./system-startup-sequence.controller";
import { CrossServiceCompatibilityService } from "../../shared/services/cross-service-compatibility.service";
import { EconomicBrainReadinessService } from "../../shared/services/economic-brain-readiness.service";
import { EnvironmentContractService } from "../../shared/services/environment-contract.service";
import { FastapiIntelligenceConsumptionService } from "../../shared/services/fastapi-intelligence-consumption.service";
import { FastapiIntelligenceHttpService } from "../../shared/services/fastapi-intelligence-http.service";
import { FastapiLaunchService } from "../../shared/services/fastapi-launch.service";
import { FastapiRuntimeCompatibilityService } from "../../shared/services/fastapi-runtime-compatibility.service";
import { FastapiStartupCompatibilityService } from "../../shared/services/fastapi-startup-compatibility.service";
import { IntelligenceDecisionFacadeService } from "../../shared/services/intelligence-decision-facade.service";
import { InternalRequestHeadersService } from "../../shared/services/internal-request-headers.service";
import { LaunchGateService } from "../../shared/services/launch-gate.service";
import { RuntimeBlockersService } from "../../shared/services/runtime-blockers.service";
import { ServiceRuntimeRegistryService } from "../../shared/services/service-runtime-registry.service";
import { StartupAuditLogService } from "../../shared/services/startup-audit-log.service";
import { SystemBootstrapOrchestratorService } from "../../shared/services/system-bootstrap-orchestrator.service";
import { SystemStartupSequenceService } from "../../shared/services/system-startup-sequence.service";
import { CommerceBoundaryAuditService } from "../commerce/commerce-boundary-audit.service";
import { SystemLaunchGateGuard } from "../../shared/guards/system-launch-gate.guard";
import { SystemAdminSummaryService } from "./system-admin-summary.service";
import { SystemReadinessMatrixService } from "./system-readiness-matrix.service";
import { SystemOrchestrationIndexService } from "./system-orchestration-index.service";

@Module({
  imports: [
    ConfigModule,
    WatchModule,
    AffiliateModule,
    PaymentsModule,
    AiStoriesModule,
    CommerceModule,
  ],
  controllers: [
    SystemLaunchReadinessController,
    SystemCompatibilityController,
    SystemRuntimeStatusController,
    SystemLaunchGateController,
    SystemOpsController,
    SystemIntelligenceOrchestrationController,
    SystemStartupSequenceController,
    SystemDeploymentHardeningController,
    SystemEnvironmentContractController,
    SystemClosureController,
    SystemBootstrapHardeningController,
    SystemLaunchClosureController,
    SystemAdminOpsController,
  ],
  providers: [
    InternalRequestHeadersService,
    StartupAuditLogService,
    ServiceRuntimeRegistryService,
    RuntimeBlockersService,
    FastapiIntelligenceHttpService,
    FastapiLaunchService,
    FastapiIntelligenceConsumptionService,
    FastapiStartupCompatibilityService,
    FastapiRuntimeCompatibilityService,
    CrossServiceCompatibilityService,
    EconomicBrainReadinessService,
    LaunchGateService,
    SystemBootstrapOrchestratorService,
    IntelligenceDecisionFacadeService,
    EnvironmentContractService,
    SystemStartupSequenceService,
    SystemLaunchGateGuard,
    SystemLaunchReadinessService,
    SystemCompatibilityService,
    SystemRuntimeStatusService,
    SystemLaunchGateService,
    SystemOpsService,
    SystemIntelligenceOrchestrationService,
    SystemDeploymentHardeningService,
    SystemClosureService,
    SystemBootstrapHardeningService,
    SystemLaunchClosureService,
    CommerceBoundaryAuditService,
    SystemAdminOpsService,
    SystemAdminSummaryService,
    SystemReadinessMatrixService,
    SystemOrchestrationIndexService,
  ],
  exports: [
    EnvironmentContractService,
    SystemStartupSequenceService,
    LaunchGateService,
    SystemBootstrapOrchestratorService,
    SystemLaunchReadinessService,
    SystemCompatibilityService,
    SystemRuntimeStatusService,
    SystemDeploymentHardeningService,
    SystemClosureService,
    SystemBootstrapHardeningService,
    SystemLaunchClosureService,
    SystemAdminOpsService,
    SystemAdminSummaryService,
    SystemReadinessMatrixService,
    SystemOrchestrationIndexService,
  ],
})
export class SystemModule {}
