import { Injectable } from "@nestjs/common";
import { CrossServiceCompatibilityService } from "../../shared/services/cross-service-compatibility.service";
import { StartupAuditLogService } from "../../shared/services/startup-audit-log.service";

@Injectable()
export class SystemCompatibilityService {
  constructor(
    private readonly crossServiceCompatibility: CrossServiceCompatibilityService,
    private readonly startupAudit: StartupAuditLogService,
  ) {}

  async snapshot(requestId?: string) {
    const ecosystem =
      await this.crossServiceCompatibility.ecosystemSnapshot(requestId);

    return {
      success: true,
      compatibility: ecosystem.ecosystemCompatibility,
      startupAudit: {
        entries: this.startupAudit.getEntries(),
        summary: this.startupAudit.getSummary(),
      },
    };
  }
}
