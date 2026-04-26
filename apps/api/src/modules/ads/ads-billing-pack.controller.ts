import { Controller, Get, Param, UseGuards } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { InternalAuthGuard } from "../../shared/guards/internal-auth.guard";
import { AdsBillingPackService } from "./ads-billing-pack.service";

@ApiTags("ads-billing-pack")
@Controller({
  path: "ads/billing-pack",
  version: "1",
})
@UseGuards(InternalAuthGuard)
export class AdsBillingPackController {
  constructor(private readonly adsBillingPack: AdsBillingPackService) {}

  @Get(":campaignId")
  @ApiOperation({
    summary:
      "Internal ads billing pack for operational and frontend consumption",
  })
  async getPack(@Param("campaignId") campaignId: string) {
    return this.adsBillingPack.build(campaignId);
  }
}
