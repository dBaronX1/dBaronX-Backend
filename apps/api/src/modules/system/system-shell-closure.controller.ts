import { Controller, Get, Headers, UseGuards } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { InternalAuthGuard } from "../../shared/guards/internal-auth.guard";
import { SystemShellClosureService } from "./system-shell-closure.service";

@ApiTags("system-shell-closure")
@Controller({
  path: "system/shell-closure",
  version: "1",
})
@UseGuards(InternalAuthGuard)
export class SystemShellClosureController {
  constructor(
    private readonly systemShellClosure: SystemShellClosureService,
  ) {}

  @Get()
  @ApiOperation({
    summary:
      "Internal final NestJS shell closure snapshot across platform shell, admin, ops, readiness, and launch closure",
  })
  async getSnapshot(@Headers("x-request-id") requestId?: string) {
    return this.systemShellClosure.build(requestId);
  }
}
