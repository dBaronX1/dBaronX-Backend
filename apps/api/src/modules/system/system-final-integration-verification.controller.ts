import { Controller, Get, Headers, UseGuards } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { InternalAuthGuard } from "../../shared/guards/internal-auth.guard";
import { SystemFinalIntegrationVerificationService } from "./system-final-integration-verification.service";

@ApiTags("system-final-integration-verification")
@Controller({
  path: "system/final-integration-verification",
  version: "1",
})
@UseGuards(InternalAuthGuard)
export class SystemFinalIntegrationVerificationController {
  constructor(
    private readonly finalIntegrationVerification: SystemFinalIntegrationVerificationService,
  ) {}

  @Get()
  @ApiOperation({
    summary:
      "Internal final verification that closure packs are integrated through the canonical NestJS shell",
  })
  async getSnapshot(@Headers("x-request-id") requestId?: string) {
    return this.finalIntegrationVerification.build(requestId);
  }
}
