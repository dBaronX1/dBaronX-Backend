import { Controller, Get, UseGuards } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { InternalAuthGuard } from "../../shared/guards/internal-auth.guard";
import { MedusaBoundaryPolicyService } from "../../shared/services/medusa-boundary-policy.service";

@ApiTags("commerce-boundary")
@Controller({
  path: "commerce/boundary",
  version: "1",
})
@UseGuards(InternalAuthGuard)
export class CommerceBoundaryController {
  constructor(
    private readonly medusaBoundaryPolicy: MedusaBoundaryPolicyService,
  ) {}

  @Get()
  @ApiOperation({
    summary:
      "Internal Medusa boundary policy snapshot to enforce commerce-only separation",
  })
  async getSnapshot() {
    return this.medusaBoundaryPolicy.build();
  }
}
