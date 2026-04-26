import { Body, Controller, Headers, HttpCode, HttpStatus, Post, UseGuards } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { InternalAuthGuard } from "../../shared/guards/internal-auth.guard";
import { AffiliatePayoutRiskDto } from "./dto/affiliate-payout-risk.dto";
import { AffiliateIntelligenceService } from "./affiliate-intelligence.service";

@ApiTags("affiliate-intelligence")
@Controller({
  path: "affiliate/intelligence",
  version: "1",
})
@UseGuards(InternalAuthGuard)
export class AffiliateIntelligenceController {
  constructor(
    private readonly affiliateIntelligence: AffiliateIntelligenceService,
  ) {}

  @Post("payout-risk")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "Internal affiliate payout risk decision via FastAPI intelligence",
  })
  async payoutRisk(
    @Body() body: AffiliatePayoutRiskDto,
    @Headers("x-request-id") requestId?: string,
  ) {
    return this.affiliateIntelligence.payoutRisk(body, requestId);
  }
}
