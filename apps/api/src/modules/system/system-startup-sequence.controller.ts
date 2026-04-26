import { Controller, Get, Headers, UseGuards } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { InternalAuthGuard } from "../../shared/guards/internal-auth.guard";
import { SystemStartupSequenceService } from "../../shared/services/system-startup-sequence.service";

@ApiTags("system-startup-sequence")
@Controller({
  path: "system/startup-sequence",
  version: "1",
})
@UseGuards(InternalAuthGuard)
export class SystemStartupSequenceController {
  constructor(
    private readonly systemStartupSequence: SystemStartupSequenceService,
  ) {}

  @Get()
  @ApiOperation({
    summary: "Internal startup sequence snapshot across environment and services",
  })
  async getSnapshot(@Headers("x-request-id") requestId?: string) {
    return this.systemStartupSequence.build(requestId);
  }
}
