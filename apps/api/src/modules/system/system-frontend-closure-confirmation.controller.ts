import { Controller, Get, Headers, UseGuards } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { InternalAuthGuard } from "../../shared/guards/internal-auth.guard";
import { SystemFrontendClosureConfirmationService } from "./system-frontend-closure-confirmation.service";

@ApiTags("system-frontend-closure-confirmation")
@Controller({
  path: "system/frontend-closure-confirmation",
  version: "1",
})
@UseGuards(InternalAuthGuard)
export class SystemFrontendClosureConfirmationController {
  constructor(
    private readonly frontendClosureConfirmation: SystemFrontendClosureConfirmationService,
  ) {}

  @Get()
  @ApiOperation({
    summary:
      "Internal confirmation that frontend closure surfaces are backed by integrated finalization services",
  })
  async getSnapshot(@Headers("x-request-id") requestId?: string) {
    return this.frontendClosureConfirmation.build(requestId);
  }
}
