import { Controller, Get, UseGuards } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { InternalAuthGuard } from "../../shared/guards/internal-auth.guard";
import { CommerceFinalClosureReadinessService } from "./commerce-final-closure-readiness.service";

@ApiTags("commerce-final-closure-readiness")
@Controller({
  path: "commerce/final-closure-readiness",
  version: "1",
})
@UseGuards(InternalAuthGuard)
export class CommerceFinalClosureReadinessController {
  constructor(
    private readonly commerceFinalClosureReadiness: CommerceFinalClosureReadinessService,
  ) {}

  @Get()
  @ApiOperation({
    summary:
      "Internal final confirmation surface that Medusa bridge closure is complete and integrated",
  })
  async getSnapshot() {
    return this.commerceFinalClosureReadiness.build();
  }
}
