import { Body, Controller, Headers, HttpCode, HttpStatus, Post, UseGuards } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { InternalAuthGuard } from "../../shared/guards/internal-auth.guard";
import { WatchRewardDecisionDto } from "./dto/watch-reward-decision.dto";
import { WatchIntelligenceService } from "./watch-intelligence.service";

@ApiTags("watch-intelligence")
@Controller({
  path: "watch/intelligence",
  version: "1",
})
@UseGuards(InternalAuthGuard)
export class WatchIntelligenceController {
  constructor(
    private readonly watchIntelligence: WatchIntelligenceService,
  ) {}

  @Post("reward-decision")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "Internal watch-to-earn reward decision via FastAPI intelligence",
  })
  async rewardDecision(
    @Body() body: WatchRewardDecisionDto,
    @Headers("x-request-id") requestId?: string,
  ) {
    return this.watchIntelligence.rewardDecision(body, requestId);
  }
}
