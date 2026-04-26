import { Controller, Get, UseGuards } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { InternalAuthGuard } from "../../shared/guards/internal-auth.guard";
import { SystemLaunchGateGuard } from "../../shared/guards/system-launch-gate.guard";
import { SystemAdminSummaryService } from "./system-admin-summary.service";

@ApiTags("system-admin-summary")
@Controller({
  path: "system/admin-summary",
  version: "1",
})
@UseGuards(InternalAuthGuard, SystemLaunchGateGuard)
export class SystemAdminSummaryController {
  constructor(
    private readonly systemAdminSummary: SystemAdminSummaryService,
  ) {}

  @Get("dashboard")
  @ApiOperation({
    summary:
      "Internal consolidated admin dashboard across wallet, payouts, payments, suppliers, ads, AI Stories, and commerce",
  })
  async getDashboard() {
    return this.systemAdminSummary.dashboard();
  }
}
