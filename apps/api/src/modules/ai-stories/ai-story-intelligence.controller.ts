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
import { AiStoryIntelligenceService } from "./ai-story-intelligence.service";

@ApiTags("ai-story-intelligence")
@Controller({
  path: "ai-stories/intelligence",
  version: "1",
})
@UseGuards(InternalAuthGuard)
export class AiStoryIntelligenceController {
  constructor(
    private readonly aiStoryIntelligence: AiStoryIntelligenceService,
  ) {}

  @Post("promotion-risk")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "Internal AI-story promotion risk decision via FastAPI intelligence",
  })
  async promotionRisk(
    @Body() body: StoryPromotionRiskDto,
    @Headers("x-request-id") requestId?: string,
  ) {
    return this.aiStoryIntelligence.promotionRisk(body, requestId);
  }
}
