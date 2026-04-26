import { Injectable } from "@nestjs/common";
import { CommerceBoundaryAuditService } from "../commerce/commerce-boundary-audit.service";
import { CommerceHealthService } from "../commerce/commerce-health.service";
import { SystemBootstrapHardeningService } from "./system-bootstrap-hardening.service";
import { SystemClosureService } from "./system-closure.service";
import { SystemCompatibilityService } from "./system-compatibility.service";
import { SystemDeploymentHardeningService } from "./system-deployment-hardening.service";
import { SystemLaunchClosureService } from "./system-launch-closure.service";
import { SystemLaunchReadinessService } from "./system-launch-readiness.service";
import { SystemRuntimeStatusService } from "./system-runtime-status.service";

@Injectable()
export class SystemAdminOpsService {
  constructor(
    private readonly systemLaunchReadiness: SystemLaunchReadinessService,
    private readonly systemCompatibility: SystemCompatibilityService,
    private readonly systemRuntimeStatus: SystemRuntimeStatusService,
    private readonly systemDeploymentHardening: SystemDeploymentHardeningService,
    private readonly systemBootstrapHardening: SystemBootstrapHardeningService,
    private readonly systemClosure: SystemClosureService,
    private readonly systemLaunchClosure: SystemLaunchClosureService,
    private readonly commerceHealth: CommerceHealthService,
    private readonly commerceBoundaryAudit: CommerceBoundaryAuditService,
  ) {}

  async dashboard(requestId?: string) {
    const [
      launchReadiness,
      compatibility,
      runtimeStatus,
      deploymentHardening,
      bootstrapHardening,
      closure,
      launchClosure,
      commerceHealth,
    ] = await Promise.all([
      this.systemLaunchReadiness.snapshot(requestId),
      this.systemCompatibility.snapshot(requestId),
      Promise.resolve(this.systemRuntimeStatus.snapshot()),
      this.systemDeploymentHardening.build(requestId),
      this.systemBootstrapHardening.build(requestId),
      this.systemClosure.snapshot(requestId),
      this.systemLaunchClosure.build(requestId),
      this.commerceHealth.snapshot(requestId),
    ]);

    const boundaryAudit = this.commerceBoundaryAudit.build();

    return {
      success: true,
      adminOps: {
        status: launchClosure.launchClosure.ready ? "ready" : "degraded",
        launchReadiness: launchReadiness.launchReadiness,
        compatibility: compatibility.compatibility,
        runtimeStatus: runtimeStatus.runtimeStatus,
        deploymentHardening: deploymentHardening.deploymentHardening,
        bootstrapHardening: bootstrapHardening.bootstrapHardening,
        closure: closure.systemClosure,
        launchClosure: launchClosure.launchClosure,
        commerceHealth: commerceHealth.commerceHealth,
        boundaryAudit: boundaryAudit.commerceBoundaryAudit,
      },
    };
  }
}
