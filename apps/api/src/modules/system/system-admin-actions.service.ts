import { Injectable } from "@nestjs/common";
import { LaunchGateService } from "../../shared/services/launch-gate.service";
import { StartupAuditLogService } from "../../shared/services/startup-audit-log.service";
import { SystemBootstrapHardeningService } from "./system-bootstrap-hardening.service";
import { SystemClosureService } from "./system-closure.service";
import { SystemDeploymentHardeningService } from "./system-deployment-hardening.service";
import { SystemLaunchClosureService } from "./system-launch-closure.service";
import { SystemStartupSequenceService } from "../../shared/services/system-startup-sequence.service";

@Injectable()
export class SystemAdminActionsService {
  constructor(
    private readonly startupAudit: StartupAuditLogService,
    private readonly launchGate: LaunchGateService,
    private readonly startupSequence: SystemStartupSequenceService,
    private readonly bootstrapHardening: SystemBootstrapHardeningService,
    private readonly deploymentHardening: SystemDeploymentHardeningService,
    private readonly systemClosure: SystemClosureService,
    private readonly systemLaunchClosure: SystemLaunchClosureService,
  ) {}

  async recheckAll(requestId?: string) {
    const [
      startupSequence,
      bootstrapHardening,
      deploymentHardening,
      closure,
      launchClosure,
    ] = await Promise.all([
      this.startupSequence.build(requestId),
      this.bootstrapHardening.build(requestId),
      this.deploymentHardening.build(requestId),
      this.systemClosure.snapshot(requestId),
      this.systemLaunchClosure.build(requestId),
    ]);

    const launchGate = this.launchGate.snapshot();

    this.startupAudit.record({
      source: "system-admin-actions",
      status: launchClosure.launchClosure.ready ? "pass" : "warn",
      message: launchClosure.launchClosure.ready
        ? "Full system recheck passed"
        : "Full system recheck found blockers",
      details: {
        blockers: launchClosure.launchClosure.blockers,
      },
    });

    return {
      success: true,
      recheck: {
        startupSequence: startupSequence.startupSequence,
        bootstrapHardening: bootstrapHardening.bootstrapHardening,
        deploymentHardening: deploymentHardening.deploymentHardening,
        closure: closure.systemClosure,
        launchClosure: launchClosure.launchClosure,
        launchGate: launchGate.launchGate,
      },
    };
  }

  clearStartupAudit() {
    this.startupAudit.clear();

    this.startupAudit.record({
      source: "system-admin-actions",
      status: "pass",
      message: "Startup audit log cleared",
    });

    return {
      success: true,
      startupAudit: {
        cleared: true,
        summary: this.startupAudit.getSummary(),
      },
    };
  }
}
