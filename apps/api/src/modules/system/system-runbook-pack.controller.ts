import { Controller, Get, Headers, UseGuards } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { InternalAuthGuard } from "../../shared/guards/internal-auth.guard";
import { SystemRunbookPackService } from "./system-runbook-pack.service";

@ApiTags("system-runbook-pack")
@Controller({
  path: "system/runbook-pack",
  version: "1",
})
@UseGuards(InternalAuthGuard)
export class SystemRunbookPackController {
  constructor(
    private readonly runbookPack: SystemRunbookPackService,
  ) {}

  @Get()
  @ApiOperation({
    summary: "Internal operational runbook pack across NestJS lifecycle surfaces",
  })
  async getPack(@Headers("x-request-id") requestId?: string) {
    return this.runbookPack.build(requestId);
  }
}
