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
import { StoryPromotionRiskDto } from "./dto/story-promotion-risk.dto";
import { AiStoryPromotionOrchestratorService } from "./ai-story-promotion-orchestrator.service";

@ApiTags("ai-story-orchestration")
@Controller({
  path: "ai-stories/orchestration",
  version: "1",
})
@UseGuards(InternalAuthGuard)
export class AiStoryOrchestrationController {
  constructor(
    private readonly aiStoryPromotionOrchestrator: AiStoryPromotionOrchestratorService,
  ) {}

  @Post("promotion-risk")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      "Internal orchestrated AI-story promotion risk decision with audit persistence",
  })
  async promotionRisk(
    @Body() body: StoryPromotionRiskDto,
    @Headers("x-request-id") requestId?: string,
  ) {
    return this.aiStoryPromotionOrchestrator.evaluateAndAudit(body, requestId);
  }
}
