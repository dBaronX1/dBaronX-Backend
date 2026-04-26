import {
  Controller,
  Get,
  Headers,
  UseGuards,
} from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { InternalAuthGuard } from "../../shared/guards/internal-auth.guard";
import { SystemLaunchGateGuard } from "../../shared/guards/system-launch-gate.guard";
import { SystemAdminOpsService } from "./system-admin-ops.service";

@ApiTags("system-admin-ops")
@Controller({
  path: "system/admin-ops",
  version: "1",
})
@UseGuards(InternalAuthGuard, SystemLaunchGateGuard)
export class SystemAdminOpsController {
  constructor(
    private readonly systemAdminOps: SystemAdminOpsService,
  ) {}

  @Get("dashboard")
  @ApiOperation({
    summary:
      "Internal admin operations dashboard across launch, compatibility, commerce, and closure layers",
  })
  async getDashboard(@Headers("x-request-id") requestId?: string) {
    return this.systemAdminOps.dashboard(requestId);
  }
}
