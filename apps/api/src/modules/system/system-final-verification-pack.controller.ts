import { Controller, Get, Headers, UseGuards } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { InternalAuthGuard } from "../../shared/guards/internal-auth.guard";
import { SystemFinalVerificationPackService } from "./system-final-verification-pack.service";

@ApiTags("system-final-verification-pack")
@Controller({
  path: "system/final-verification-pack",
  version: "1",
})
@UseGuards(InternalAuthGuard)
export class SystemFinalVerificationPackController {
  constructor(
    private readonly finalVerificationPack: SystemFinalVerificationPackService,
  ) {}

  @Get()
  @ApiOperation({
    summary:
      "Internal final verification pack proving remaining closure surfaces are integrated through the canonical shell",
  })
  async getSnapshot(@Headers("x-request-id") requestId?: string) {
    return this.finalVerificationPack.build(requestId);
  }
}
