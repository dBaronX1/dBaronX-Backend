import { Controller, Get, Headers, UseGuards } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { InternalAuthGuard } from "../../shared/guards/internal-auth.guard";
import { SystemBootstrapHardeningService } from "./system-bootstrap-hardening.service";

@ApiTags("system-bootstrap-hardening")
@Controller({
  path: "system/bootstrap-hardening",
  version: "1",
})
@UseGuards(InternalAuthGuard)
export class SystemBootstrapHardeningController {
  constructor(
    private readonly systemBootstrapHardening: SystemBootstrapHardeningService,
  ) {}

  @Get()
  @ApiOperation({
    summary:
      "Internal bootstrap hardening snapshot across environment, startup and launch gate",
  })
  async getSnapshot(@Headers("x-request-id") requestId?: string) {
    return this.systemBootstrapHardening.build(requestId);
  }
}
