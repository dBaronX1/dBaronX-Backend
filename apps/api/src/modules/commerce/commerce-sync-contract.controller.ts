import { Controller, Get, UseGuards } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { InternalAuthGuard } from "../../shared/guards/internal-auth.guard";
import { MedusaSyncContractService } from "../../shared/services/medusa-sync-contract.service";
import { MedusaFulfillmentNormalizationPolicyService } from "../../shared/services/medusa-fulfillment-normalization-policy.service";

@ApiTags("commerce-sync-contract")
@Controller({
  path: "commerce/sync-contract",
  version: "1",
})
@UseGuards(InternalAuthGuard)
export class CommerceSyncContractController {
  constructor(
    private readonly medusaSyncContract: MedusaSyncContractService,
    private readonly fulfillmentNormalizationPolicy: MedusaFulfillmentNormalizationPolicyService,
  ) {}

  @Get()
  @ApiOperation({
    summary:
      "Internal commerce-only sync contract and fulfillment normalization policy for Medusa bridge closure",
  })
  async getSnapshot() {
    return {
      success: true,
      medusaSyncContract: this.medusaSyncContract.build().medusaSyncContract,
      medusaFulfillmentNormalizationPolicy:
        this.fulfillmentNormalizationPolicy.build()
          .medusaFulfillmentNormalizationPolicy,
    };
  }
}
