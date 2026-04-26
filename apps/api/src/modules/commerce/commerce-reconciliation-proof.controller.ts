import { Controller, Get, UseGuards } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { InternalAuthGuard } from "../../shared/guards/internal-auth.guard";
import { MedusaReconciliationProofService } from "../../shared/services/medusa-reconciliation-proof.service";

@ApiTags("commerce-reconciliation-proof")
@Controller({
  path: "commerce/reconciliation-proof",
  version: "1",
})
@UseGuards(InternalAuthGuard)
export class CommerceReconciliationProofController {
  constructor(
    private readonly medusaReconciliationProof: MedusaReconciliationProofService,
  ) {}

  @Get()
  @ApiOperation({
    summary:
      "Internal proof surface that reconciliation and settlement authority remain in NestJS, not Medusa",
  })
  async getSnapshot() {
    return this.medusaReconciliationProof.build();
  }
}
