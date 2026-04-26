import {
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  Headers,
  UseGuards,
} from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { InternalAuthGuard } from "../../shared/guards/internal-auth.guard";
import { SystemLaunchGateGuard } from "../../shared/guards/system-launch-gate.guard";
import { SystemAdminActionsService } from "./system-admin-actions.service";

@ApiTags("system-admin-actions")
@Controller({
  path: "system/admin-actions",
  version: "1",
})
@UseGuards(InternalAuthGuard)
export class SystemAdminActionsController {
  constructor(
    private readonly systemAdminActions: SystemAdminActionsService,
  ) {}

  @Post("recheck-all")
  @HttpCode(HttpStatus.OK)
  @UseGuards(SystemLaunchGateGuard)
  @ApiOperation({
    summary:
      "Internal full recheck across startup, hardening, closure, and launch gate layers",
  })
  async recheckAll(@Headers("x-request-id") requestId?: string) {
    return this.systemAdminActions.recheckAll(requestId);
  }

  @Post("clear-startup-audit")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "Internal clear startup audit trail and reinitialize logging",
  })
  async clearStartupAudit() {
    return this.systemAdminActions.clearStartupAudit();
  }
}
