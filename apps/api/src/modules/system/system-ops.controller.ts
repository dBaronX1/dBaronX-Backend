import { Controller, Get, Headers, UseGuards } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { InternalAuthGuard } from "../../shared/guards/internal-auth.guard";
import { SystemOpsService } from "./system-ops.service";

@ApiTags("system-ops")
@Controller({
  path: "system/ops",
  version: "1",
})
@UseGuards(InternalAuthGuard)
export class SystemOpsController {
  constructor(private readonly systemOps: SystemOpsService) {}

  @Get()
  @ApiOperation({
    summary: "Internal operational snapshot across launch gate and compatibility layers",
  })
  async getSnapshot(@Headers("x-request-id") requestId?: string) {
    return this.systemOps.snapshot(requestId);
  }
}
