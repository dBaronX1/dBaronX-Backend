import { Controller, Get, Headers, UseGuards } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { InternalAuthGuard } from "../../shared/guards/internal-auth.guard";
import { SystemFinalReleasePackService } from "../../shared/services/system-final-release-pack.service";

@ApiTags("system-final-release-pack")
@Controller({
  path: "system/final-release-pack",
  version: "1",
})
@UseGuards(InternalAuthGuard)
export class SystemFinalReleasePackController {
  constructor(
    private readonly finalReleasePack: SystemFinalReleasePackService,
  ) {}

  @Get()
  @ApiOperation({
    summary: "Internal aggregate final release pack across launch, Medusa, deployment, startup, and runtime",
  })
  async getSnapshot(@Headers("x-request-id") requestId?: string) {
    return this.finalReleasePack.build(requestId);
  }
}
