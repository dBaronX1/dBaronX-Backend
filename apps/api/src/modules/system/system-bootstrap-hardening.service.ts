import { Injectable } from "@nestjs/common";
import { EnvironmentContractService } from "../../shared/services/environment-contract.service";
import { LaunchGateService } from "../../shared/services/launch-gate.service";
import { StartupAuditLogService } from "../../shared/services/startup-audit-log.service";
import { SystemStartupSequenceService } from "../../shared/services/system-startup-sequence.service";

@Injectable()
export class SystemBootstrapHardeningService {
  constructor(
    private readonly environmentContract: EnvironmentContractService,
    private readonly systemStartupSequence: SystemStartupSequenceService,
    private readonly launchGate: LaunchGateService,
    private readonly startupAudit: StartupAuditLogService,
  ) {}

  async build(requestId?: string) {
    const environment = this.environmentContract.build().environmentContract;
    const startup = await this.systemStartupSequence.build(requestId);
    const gate = this.launchGate.snapshot().launchGate;

    const hardeningChecks = {
      environmentContractValid: environment.valid,
      startupSequenceReady: startup.startupSequence.ready,
      launchGateReady: gate.ready,
      startupAuditHasFailures: this.startupAudit.getSummary().fail > 0,
    };

    const blockers = [
      ...(!hardeningChecks.environmentContractValid
        ? environment.missing.map((item) => `env:${item}`)
        : []),
      ...(!hardeningChecks.startupSequenceReady
        ? startup.startupSequence.blockers
        : []),
      ...(!hardeningChecks.launchGateReady ? gate.blockers : []),
      ...(hardeningChecks.startupAuditHasFailures
        ? ["startup_audit_contains_failures"]
        : []),
    ];

    return {
      success: true,
      bootstrapHardening: {
        hardened:
          hardeningChecks.environmentContractValid &&
          hardeningChecks.startupSequenceReady &&
          hardeningChecks.launchGateReady &&
          !hardeningChecks.startupAuditHasFailures,
        checks: hardeningChecks,
        blockers,
      },
    };
  }
}
