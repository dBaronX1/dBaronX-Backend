import { Controller, Get, Headers, UseGuards } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { InternalAuthGuard } from "../../shared/guards/internal-auth.guard";
import { SystemLaunchReadinessService } from "./system-launch-readiness.service";

@ApiTags("system-launch-readiness")
@Controller({
  path: "system/launch-readiness",
  version: "1",
})
@UseGuards(InternalAuthGuard)
export class SystemLaunchReadinessController {
  constructor(
    private readonly systemLaunchReadiness: SystemLaunchReadinessService,
  ) {}

  @Get()
  @ApiOperation({
    summary: "Internal launch-readiness snapshot across NestJS and FastAPI",
  })
  async getSnapshot(@Headers("x-request-id") requestId?: string) {
    return this.systemLaunchReadiness.snapshot(requestId);
  }
}
