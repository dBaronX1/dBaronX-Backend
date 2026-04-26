import { Controller, Get, Headers, UseGuards } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { InternalAuthGuard } from "../../shared/guards/internal-auth.guard";
import { SystemBootstrapReportService } from "./system-bootstrap-report.service";

@ApiTags("system-bootstrap-report")
@Controller({
  path: "system/bootstrap-report",
  version: "1",
})
@UseGuards(InternalAuthGuard)
export class SystemBootstrapReportController {
  constructor(
    private readonly systemBootstrapReport: SystemBootstrapReportService,
  ) {}

  @Get()
  @ApiOperation({
    summary: "Internal bootstrap report across app shell, startup sequence, and hardening",
  })
  async getSnapshot(@Headers("x-request-id") requestId?: string) {
    return this.systemBootstrapReport.build(requestId);
  }
}
