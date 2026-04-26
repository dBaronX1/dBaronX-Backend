import { Controller, Get, Headers, Param, UseGuards } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { InternalAuthGuard } from "../../shared/guards/internal-auth.guard";
import { CommerceFulfillmentProviderNormalizationService } from "./commerce-fulfillment-provider-normalization.service";

@ApiTags("commerce-fulfillment-provider-normalization")
@Controller({
  path: "commerce/fulfillment",
  version: "1",
})
@UseGuards(InternalAuthGuard)
export class CommerceFulfillmentProviderNormalizationController {
  constructor(
    private readonly normalization: CommerceFulfillmentProviderNormalizationService,
  ) {}

  @Get(":medusaOrderId/provider-normalization")
  @ApiOperation({
    summary:
      "Internal fulfillment provider normalization across Medusa fulfillment state",
  })
  async getSnapshot(
    @Param("medusaOrderId") medusaOrderId: string,
    @Headers("x-request-id") requestId?: string,
  ) {
    return this.normalization.normalize(medusaOrderId, requestId);
  }
}
