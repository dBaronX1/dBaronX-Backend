import { Controller, Get, Headers, UseGuards } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { InternalAuthGuard } from "../../shared/guards/internal-auth.guard";
import { SystemDeploymentHardeningService } from "./system-deployment-hardening.service";

@ApiTags("system-deployment-hardening")
@Controller({
  path: "system/deployment-hardening",
  version: "1",
})
@UseGuards(InternalAuthGuard)
export class SystemDeploymentHardeningController {
  constructor(
    private readonly systemDeploymentHardening: SystemDeploymentHardeningService,
  ) {}

  @Get()
  @ApiOperation({
    summary:
      "Internal deployment hardening snapshot across environment, startup sequence, and launch gate",
  })
  async getSnapshot(@Headers("x-request-id") requestId?: string) {
    return this.systemDeploymentHardening.build(requestId);
  }
}
