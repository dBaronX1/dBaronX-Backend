import { Controller, Get, UseGuards } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { InternalAuthGuard } from "../../shared/guards/internal-auth.guard";
import { SystemLaunchGateService } from "./system-launch-gate.service";

@ApiTags("system-launch-gate")
@Controller({
  path: "system/launch-gate",
  version: "1",
})
@UseGuards(InternalAuthGuard)
export class SystemLaunchGateController {
  constructor(
    private readonly systemLaunchGate: SystemLaunchGateService,
  ) {}

  @Get()
  @ApiOperation({
    summary: "Internal launch gate snapshot for NestJS economic brain",
  })
  async getSnapshot() {
    return this.systemLaunchGate.snapshot();
  }
}
