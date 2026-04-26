import { Controller, Get, Headers, UseGuards } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { InternalAuthGuard } from "../../shared/guards/internal-auth.guard";
import { PlatformAdminPackService } from "./platform-admin-pack.service";

@ApiTags("platform-admin-pack")
@Controller({
  path: "platform/admin-pack",
  version: "1",
})
@UseGuards(InternalAuthGuard)
export class PlatformAdminPackController {
  constructor(
    private readonly platformAdminPack: PlatformAdminPackService,
  ) {}

  @Get()
  @ApiOperation({
    summary:
      "Internal platform admin pack for Telegram control surfaces and ops tooling",
  })
  async getPack(@Headers("x-request-id") requestId?: string) {
    return this.platformAdminPack.build(requestId);
  }
}
