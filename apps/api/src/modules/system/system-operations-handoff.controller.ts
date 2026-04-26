import { Controller, Get, Headers, UseGuards } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { InternalAuthGuard } from "../../shared/guards/internal-auth.guard";
import { SystemOperationsHandoffService } from "./system-operations-handoff.service";

@ApiTags("system-operations-handoff")
@Controller({
  path: "system/operations-handoff",
  version: "1",
})
@UseGuards(InternalAuthGuard)
export class SystemOperationsHandoffController {
  constructor(
    private readonly systemOperationsHandoff: SystemOperationsHandoffService,
  ) {}

  @Get()
  @ApiOperation({
    summary: "Internal handoff package from NestJS shell closure to next subsystem work",
  })
  async getSnapshot(@Headers("x-request-id") requestId?: string) {
    return this.systemOperationsHandoff.build(requestId);
  }
}
