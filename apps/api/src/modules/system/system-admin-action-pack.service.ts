import { Injectable } from "@nestjs/common";
import { SystemAdminActionsService } from "./system-admin-actions.service";
import { SystemAdminSummaryService } from "./system-admin-summary.service";
import { SystemReadinessMatrixService } from "./system-readiness-matrix.service";

@Injectable()
export class SystemAdminActionPackService {
  constructor(
    private readonly systemAdminSummary: SystemAdminSummaryService,
    private readonly systemReadinessMatrix: SystemReadinessMatrixService,
    private readonly systemAdminActions: SystemAdminActionsService,
  ) {}

  async build(requestId?: string) {
    const [summary, matrix] = await Promise.all([
      this.systemAdminSummary.dashboard(),
      this.systemReadinessMatrix.build(requestId),
    ]);

    return {
      success: true,
      adminActionPack: {
        summary: summary.systemAdminSummary,
        readinessMatrix: matrix.readinessMatrix,
        supportedActions: [
          "recheck-all",
          "clear-startup-audit",
        ],
        actionEndpoints: {
          recheckAll: "/api/v1/system/admin-actions/recheck-all",
          clearStartupAudit: "/api/v1/system/admin-actions/clear-startup-audit",
        },
      },
    };
  }
}
