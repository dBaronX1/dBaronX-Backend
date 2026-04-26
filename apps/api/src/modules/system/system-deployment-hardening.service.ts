import { Injectable } from "@nestjs/common";
import { EnvironmentContractService } from "../../shared/services/environment-contract.service";
import { LaunchGateService } from "../../shared/services/launch-gate.service";
import { SystemStartupSequenceService } from "../../shared/services/system-startup-sequence.service";

@Injectable()
export class SystemDeploymentHardeningService {
  constructor(
    private readonly environmentContract: EnvironmentContractService,
    private readonly systemStartupSequence: SystemStartupSequenceService,
    private readonly launchGate: LaunchGateService,
  ) {}

  async build(requestId?: string) {
    const environment = this.environmentContract.build().environmentContract;
    const startup = await this.systemStartupSequence.build(requestId);
    const gate = this.launchGate.snapshot().launchGate;

    const checks = {
      environmentContractValid: environment.valid,
      startupSequenceReady: startup.startupSequence.ready,
      launchGateReady: gate.ready,
    };

    const blockers = [
      ...(!environment.valid ? environment.missing.map((k) => `env:${k}`) : []),
      ...(!startup.startupSequence.ready ? startup.startupSequence.blockers : []),
      ...(!gate.ready ? gate.blockers : []),
    ];

    return {
      success: true,
      deploymentHardening: {
        ready: Object.values(checks).every(Boolean),
        checks,
        blockers,
      },
    };
  }
}
