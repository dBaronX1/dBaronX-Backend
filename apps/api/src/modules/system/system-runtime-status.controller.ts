import { Controller, Get, UseGuards } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { InternalAuthGuard } from "../../shared/guards/internal-auth.guard";
import { SystemRuntimeStatusService } from "./system-runtime-status.service";

@ApiTags("system-runtime-status")
@Controller({
  path: "system/runtime-status",
  version: "1",
})
@UseGuards(InternalAuthGuard)
export class SystemRuntimeStatusController {
  constructor(
    private readonly systemRuntimeStatus: SystemRuntimeStatusService,
  ) {}

  @Get()
  @ApiOperation({
    summary: "Internal runtime registry and startup audit snapshot",
  })
  async getSnapshot() {
    return this.systemRuntimeStatus.snapshot();
  }
}
