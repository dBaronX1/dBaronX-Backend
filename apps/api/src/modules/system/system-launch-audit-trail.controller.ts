import { Controller, Get, UseGuards } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { InternalAuthGuard } from "../../shared/guards/internal-auth.guard";
import { SystemLaunchAuditTrailService } from "./system-launch-audit-trail.service";

@ApiTags("system-launch-audit-trail")
@Controller({
  path: "system/launch-audit-trail",
  version: "1",
})
@UseGuards(InternalAuthGuard)
export class SystemLaunchAuditTrailController {
  constructor(
    private readonly systemLaunchAuditTrail: SystemLaunchAuditTrailService,
  ) {}

  @Get()
  @ApiOperation({
    summary:
      "Internal launch audit trail across startup audit, intelligence traces, and readiness snapshots",
  })
  async getSnapshot() {
    return this.systemLaunchAuditTrail.snapshot();
  }
}
