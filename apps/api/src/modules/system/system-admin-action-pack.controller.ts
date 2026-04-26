import { Controller, Get, Headers, UseGuards } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { InternalAuthGuard } from "../../shared/guards/internal-auth.guard";
import { SystemLaunchGateGuard } from "../../shared/guards/system-launch-gate.guard";
import { SystemAdminActionPackService } from "./system-admin-action-pack.service";

@ApiTags("system-admin-action-pack")
@Controller({
  path: "system/admin-action-pack",
  version: "1",
})
@UseGuards(InternalAuthGuard, SystemLaunchGateGuard)
export class SystemAdminActionPackController {
  constructor(
    private readonly systemAdminActionPack: SystemAdminActionPackService,
  ) {}

  @Get()
  @ApiOperation({
    summary: "Internal admin action pack for operations and Telegram control surfaces",
  })
  async getPack(@Headers("x-request-id") requestId?: string) {
    return this.systemAdminActionPack.build(requestId);
  }
}
