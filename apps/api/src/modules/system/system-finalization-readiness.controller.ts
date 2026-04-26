import { Controller, Get, Headers, UseGuards } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { InternalAuthGuard } from "../../shared/guards/internal-auth.guard";
import { SystemFinalizationReadinessService } from "./system-finalization-readiness.service";

@ApiTags("system-finalization-readiness")
@Controller({
  path: "system/finalization-readiness",
  version: "1",
})
@UseGuards(InternalAuthGuard)
export class SystemFinalizationReadinessController {
  constructor(
    private readonly finalizationReadiness: SystemFinalizationReadinessService,
  ) {}

  @Get()
  @ApiOperation({
    summary:
      "Internal readiness confirmation that final closure packs are wired into the canonical shell",
  })
  async getSnapshot(@Headers("x-request-id") requestId?: string) {
    return this.finalizationReadiness.build(requestId);
  }
}
