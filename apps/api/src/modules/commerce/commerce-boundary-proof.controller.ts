import { Controller, Get, UseGuards } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { InternalAuthGuard } from "../../shared/guards/internal-auth.guard";
import { MedusaBoundaryProofService } from "../../shared/services/medusa-boundary-proof.service";

@ApiTags("commerce-boundary-proof")
@Controller({
  path: "commerce/boundary-proof",
  version: "1",
})
@UseGuards(InternalAuthGuard)
export class CommerceBoundaryProofController {
  constructor(
    private readonly medusaBoundaryProof: MedusaBoundaryProofService,
  ) {}

  @Get()
  @ApiOperation({
    summary:
      "Internal proof surface that Medusa remains commerce-only and does not own economic logic",
  })
  async getSnapshot() {
    return this.medusaBoundaryProof.build();
  }
}
