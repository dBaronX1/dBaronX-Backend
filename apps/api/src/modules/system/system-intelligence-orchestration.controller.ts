import { Controller, Get, Headers, UseGuards } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { InternalAuthGuard } from "../../shared/guards/internal-auth.guard";
import { SystemIntelligenceOrchestrationService } from "./system-intelligence-orchestration.service";

@ApiTags("system-intelligence-orchestration")
@Controller({
  path: "system/intelligence",
  version: "1",
})
@UseGuards(InternalAuthGuard)
export class SystemIntelligenceOrchestrationController {
  constructor(
    private readonly systemIntelligenceOrchestration: SystemIntelligenceOrchestrationService,
  ) {}

  @Get("snapshot")
  @ApiOperation({
    summary:
      "Internal FastAPI intelligence orchestration snapshot for NestJS economic brain",
  })
  async getSnapshot(@Headers("x-request-id") requestId?: string) {
    return this.systemIntelligenceOrchestration.capabilitySnapshot(requestId);
  }
}
