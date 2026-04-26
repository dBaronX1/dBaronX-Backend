import { Injectable } from "@nestjs/common";
import { CrossServiceCompatibilityService } from "./cross-service-compatibility.service";
import { EnvironmentContractService } from "./environment-contract.service";
import { LaunchGateService } from "./launch-gate.service";
import { StartupAuditLogService } from "./startup-audit-log.service";

@Injectable()
export class SystemStartupSequenceService {
  constructor(
    private readonly environmentContract: EnvironmentContractService,
    private readonly crossServiceCompatibility: CrossServiceCompatibilityService,
    private readonly launchGate: LaunchGateService,
    private readonly startupAudit: StartupAuditLogService,
  ) {}

  async build(requestId?: string) {
    const environment = this.environmentContract.build().environmentContract;
    const compatibility =
      await this.crossServiceCompatibility.ecosystemSnapshot(requestId);
    const launchGate = this.launchGate.snapshot().launchGate;

    const steps = [
      {
        step: 1,
        name: "environment-contract",
        ready: environment.valid,
        blockers: environment.missing,
      },
      {
        step: 2,
        name: "cross-service-compatibility",
        ready: compatibility.ecosystemCompatibility.status === "ready",
        blockers: compatibility.ecosystemCompatibility.services.fastapi.blockers,
      },
      {
        step: 3,
        name: "launch-gate",
        ready: launchGate.ready,
        blockers: launchGate.blockers,
      },
    ];

    const blockers = steps.flatMap((step) =>
      step.ready ? [] : step.blockers.map((item) => `${step.name}:${item}`),
    );

    this.startupAudit.record({
      source: "system-startup-sequence",
      status: blockers.length === 0 ? "pass" : "warn",
      message:
        blockers.length === 0
          ? "System startup sequence ready"
          : "System startup sequence has blockers",
      details: {
        blockers,
      },
    });

    return {
      success: true,
      startupSequence: {
        ready: blockers.length === 0,
        steps,
        blockers,
      },
    };
  }
}
