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
import { WatchRewardDecisionDto } from "./dto/watch-reward-decision.dto";
import { WatchRewardOrchestratorService } from "./watch-reward-orchestrator.service";

@ApiTags("watch-orchestration")
@Controller({
  path: "watch/orchestration",
  version: "1",
})
@UseGuards(InternalAuthGuard)
export class WatchOrchestrationController {
  constructor(
    private readonly watchRewardOrchestrator: WatchRewardOrchestratorService,
  ) {}

  @Post("reward-decision")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      "Internal orchestrated watch reward decision with audit persistence",
  })
  async rewardDecision(
    @Body() body: WatchRewardDecisionDto,
    @Headers("x-request-id") requestId?: string,
  ) {
    return this.watchRewardOrchestrator.decideAndAudit(body, requestId);
  }
}
