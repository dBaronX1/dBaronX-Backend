import {
  Body,
  Controller,
  Headers,
  HttpCode,
  HttpStatus,
  Post,
  UseGuards,
} from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { InternalAuthGuard } from "../../shared/guards/internal-auth.guard";
import { AffiliatePayoutRiskDto } from "./dto/affiliate-payout-risk.dto";
import { AffiliatePayoutOrchestratorService } from "./affiliate-payout-orchestrator.service";

@ApiTags("affiliate-orchestration")
@Controller({
  path: "affiliate/orchestration",
  version: "1",
})
@UseGuards(InternalAuthGuard)
export class AffiliateOrchestrationController {
  constructor(
    private readonly affiliatePayoutOrchestrator: AffiliatePayoutOrchestratorService,
  ) {}

  @Post("payout-risk")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      "Internal orchestrated affiliate payout risk decision with audit persistence",
  })
  async payoutRisk(
    @Body() body: AffiliatePayoutRiskDto,
    @Headers("x-request-id") requestId?: string,
  ) {
    return this.affiliatePayoutOrchestrator.evaluateAndAudit(body, requestId);
  }
}
