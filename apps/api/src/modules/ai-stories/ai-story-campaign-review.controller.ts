import { Controller, Get, UseGuards } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { InternalAuthGuard } from "../../shared/guards/internal-auth.guard";
import { AiStoryCampaignReviewService } from "./ai-story-campaign-review.service";

@ApiTags("ai-story-campaign-review")
@Controller({
  path: "ai-stories/review",
  version: "1",
})
@UseGuards(InternalAuthGuard)
export class AiStoryCampaignReviewController {
  constructor(
    private readonly aiStoryCampaignReview: AiStoryCampaignReviewService,
  ) {}

  @Get("queue")
  @ApiOperation({
    summary: "Internal AI Stories campaign review queue for operations",
  })
  async getQueue() {
    return this.aiStoryCampaignReview.queue();
  }
}
