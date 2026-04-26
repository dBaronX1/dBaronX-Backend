import { Injectable, Logger } from "@nestjs/common";
import { EnvironmentContractService } from "../services/environment-contract.service";
import { LaunchGateService } from "../services/launch-gate.service";
import { StartupAuditLogService } from "../services/startup-audit-log.service";
import { SystemStartupSequenceService } from "../services/system-startup-sequence.service";

@Injectable()
export class AppBootstrapService {
  private readonly logger = new Logger(AppBootstrapService.name);

  constructor(
    private readonly environmentContract: EnvironmentContractService,
    private readonly startupSequence: SystemStartupSequenceService,
    private readonly launchGate: LaunchGateService,
    private readonly startupAudit: StartupAuditLogService,
  ) {}

  async run(requestId?: string) {
    const environment = this.environmentContract.build().environmentContract;
    const sequence = await this.startupSequence.build(requestId);
    const launchGate = this.launchGate.snapshot().launchGate;

    const bootstrap = {
      environmentValid: environment.valid,
      startupReady: sequence.startupSequence.ready,
      launchGateReady: launchGate.ready,
      blockers: [
        ...(!environment.valid ? environment.missing.map((x) => `env:${x}`) : []),
        ...(!sequence.startupSequence.ready ? sequence.startupSequence.blockers : []),
        ...(!launchGate.ready ? launchGate.blockers : []),
      ],
      startupAudit: this.startupAudit.getSummary(),
    };

    this.logger.log(
      JSON.stringify({
        source: "app-bootstrap",
        ...bootstrap,
        timestamp: new Date().toISOString(),
      }),
    );

    return {
      success: true,
      bootstrap,
    };
  }
}
