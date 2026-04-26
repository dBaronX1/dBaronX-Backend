import { Injectable } from "@nestjs/common";
import { ServiceRuntimeRegistryService } from "../../shared/services/service-runtime-registry.service";
import { StartupAuditLogService } from "../../shared/services/startup-audit-log.service";

@Injectable()
export class SystemRuntimeStatusService {
  constructor(
    private readonly runtimeRegistry: ServiceRuntimeRegistryService,
    private readonly startupAudit: StartupAuditLogService,
  ) {}

  snapshot() {
    return {
      success: true,
      runtimeStatus: {
        services: this.runtimeRegistry.getAll(),
        summary: this.runtimeRegistry.summary(),
        startupAudit: {
          entries: this.startupAudit.getEntries(),
          summary: this.startupAudit.getSummary(),
        },
      },
    };
  }
}
