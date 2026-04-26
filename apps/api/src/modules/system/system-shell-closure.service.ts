import { Injectable } from "@nestjs/common";
import { PlatformShellService } from "../platform/platform-shell.service";
import { SystemAdminSummaryService } from "./system-admin-summary.service";
import { SystemAdminOpsService } from "./system-admin-ops.service";
import { SystemLaunchClosureService } from "./system-launch-closure.service";
import { SystemReadinessMatrixService } from "./system-readiness-matrix.service";

@Injectable()
export class SystemShellClosureService {
  constructor(
    private readonly platformShell: PlatformShellService,
    private readonly systemAdminSummary: SystemAdminSummaryService,
    private readonly systemAdminOps: SystemAdminOpsService,
    private readonly systemReadinessMatrix: SystemReadinessMatrixService,
    private readonly systemLaunchClosure: SystemLaunchClosureService,
  ) {}

  async build(requestId?: string) {
    const [
      platformShell,
      adminSummary,
      adminOps,
      readinessMatrix,
      launchClosure,
    ] = await Promise.all([
      this.platformShell.snapshot(requestId),
      this.systemAdminSummary.dashboard(),
      this.systemAdminOps.dashboard(requestId),
      this.systemReadinessMatrix.build(requestId),
      this.systemLaunchClosure.build(requestId),
    ]);

    const closed =
      platformShell.platformShell.ready &&
      launchClosure.launchClosure.ready;

    return {
      success: true,
      shellClosure: {
        closed,
        blockers: launchClosure.launchClosure.blockers,
        platformShell: platformShell.platformShell,
        adminSummary: adminSummary.systemAdminSummary,
        adminOps: adminOps.adminOps,
        readinessMatrix: readinessMatrix.readinessMatrix,
      },
    };
  }
}
