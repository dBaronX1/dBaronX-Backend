import { Controller, Get, Headers, UseGuards } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { InternalAuthGuard } from "../../shared/guards/internal-auth.guard";
import { SystemLaunchClosureService } from "./system-launch-closure.service";

@ApiTags("system-launch-closure")
@Controller({
  path: "system/launch-closure",
  version: "1",
})
@UseGuards(InternalAuthGuard)
export class SystemLaunchClosureController {
  constructor(
    private readonly systemLaunchClosure: SystemLaunchClosureService,
  ) {}

  @Get()
  @ApiOperation({
    summary:
      "Internal final launch-closure snapshot across startup, commerce, boundary and launch gate",
  })
  async getSnapshot(@Headers("x-request-id") requestId?: string) {
    return this.systemLaunchClosure.build(requestId);
  }
}
