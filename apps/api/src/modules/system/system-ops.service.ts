import { Injectable } from "@nestjs/common";
import { CrossServiceCompatibilityService } from "../../shared/services/cross-service-compatibility.service";
import { LaunchGateService } from "../../shared/services/launch-gate.service";
import { ServiceRuntimeRegistryService } from "../../shared/services/service-runtime-registry.service";
import { StartupAuditLogService } from "../../shared/services/startup-audit-log.service";

@Injectable()
export class SystemOpsService {
  constructor(
    private readonly crossServiceCompatibility: CrossServiceCompatibilityService,
    private readonly launchGate: LaunchGateService,
    private readonly runtimeRegistry: ServiceRuntimeRegistryService,
    private readonly startupAudit: StartupAuditLogService,
  ) {}

  async snapshot(requestId?: string) {
    const [ecosystem, launchGate] = await Promise.all([
      this.crossServiceCompatibility.ecosystemSnapshot(requestId),
      Promise.resolve(this.launchGate.snapshot()),
    ]);

    return {
      success: true,
      ops: {
        ecosystemCompatibility: ecosystem.ecosystemCompatibility,
        launchGate: launchGate.launchGate,
        runtimeRegistry: {
          services: this.runtimeRegistry.getAll(),
          summary: this.runtimeRegistry.summary(),
        },
        startupAudit: {
          entries: this.startupAudit.getEntries(),
          summary: this.startupAudit.getSummary(),
        },
      },
    };
  }
}
