import { Controller, Get, Headers, UseGuards } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { InternalAuthGuard } from "../../shared/guards/internal-auth.guard";
import { SystemReadinessMatrixService } from "./system-readiness-matrix.service";

@ApiTags("system-readiness-matrix")
@Controller({
  path: "system/readiness-matrix",
  version: "1",
})
@UseGuards(InternalAuthGuard)
export class SystemReadinessMatrixController {
  constructor(
    private readonly systemReadinessMatrix: SystemReadinessMatrixService,
  ) {}

  @Get()
  @ApiOperation({
    summary: "Internal readiness matrix across all major NestJS operational domains",
  })
  async getSnapshot(@Headers("x-request-id") requestId?: string) {
    return this.systemReadinessMatrix.build(requestId);
  }
}
