import { Controller, Get, UseGuards } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { InternalAuthGuard } from "../../shared/guards/internal-auth.guard";
import { SystemStartupGateService } from "../../shared/services/system-startup-gate.service";

@ApiTags("system-startup-gate")
@Controller({
  path: "system/startup-gate",
  version: "1",
})
@UseGuards(InternalAuthGuard)
export class SystemStartupGateController {
  constructor(
    private readonly systemStartupGate: SystemStartupGateService,
  ) {}

  @Get()
  @ApiOperation({
    summary: "Internal startup gate surface for final launch hardening",
  })
  async getSnapshot() {
    return this.systemStartupGate.build();
  }
}
