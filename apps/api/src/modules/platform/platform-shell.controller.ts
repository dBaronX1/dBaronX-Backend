import { Controller, Get, Headers, UseGuards } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { InternalAuthGuard } from "../../shared/guards/internal-auth.guard";
import { PlatformShellService } from "./platform-shell.service";

@ApiTags("platform-shell")
@Controller({
  path: "platform",
  version: "1",
})
@UseGuards(InternalAuthGuard)
export class PlatformShellController {
  constructor(private readonly platformShell: PlatformShellService) {}

  @Get("shell")
  @ApiOperation({
    summary:
      "Internal platform shell snapshot across orchestration routes and launch closure",
  })
  async getShell(@Headers("x-request-id") requestId?: string) {
    return this.platformShell.snapshot(requestId);
  }
}
