import { Controller, Get, Headers, UseGuards } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { InternalAuthGuard } from "../../shared/guards/internal-auth.guard";
import { SystemFinalLaunchClosureService } from "../../shared/services/system-final-launch-closure.service";

@ApiTags("system-final-launch-closure")
@Controller({
  path: "system/final-launch-closure",
  version: "1",
})
@UseGuards(InternalAuthGuard)
export class SystemFinalLaunchClosureController {
  constructor(
    private readonly finalLaunchClosure: SystemFinalLaunchClosureService,
  ) {}

  @Get()
  @ApiOperation({
    summary: "Internal final launch closure pack across launch and shell closure",
  })
  async getSnapshot(@Headers("x-request-id") requestId?: string) {
    return this.finalLaunchClosure.build(requestId);
  }
}
