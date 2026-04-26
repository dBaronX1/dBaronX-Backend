import { Controller, Get, UseGuards } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { InternalAuthGuard } from "../../shared/guards/internal-auth.guard";
import { SystemDeploymentReadinessService } from "../../shared/services/system-deployment-readiness.service";

@ApiTags("system-deployment-readiness")
@Controller({
  path: "system/deployment-readiness",
  version: "1",
})
@UseGuards(InternalAuthGuard)
export class SystemDeploymentReadinessController {
  constructor(
    private readonly deploymentReadiness: SystemDeploymentReadinessService,
  ) {}

  @Get()
  @ApiOperation({
    summary: "Internal deployment readiness surface for final launch operations",
  })
  async getSnapshot() {
    return this.deploymentReadiness.build();
  }
}
