import { Controller, Get, UseGuards } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { InternalAuthGuard } from "../../shared/guards/internal-auth.guard";
import { AdsCampaignReviewService } from "./ads-campaign-review.service";

@ApiTags("ads-campaign-review")
@Controller({
  path: "ads/review",
  version: "1",
})
@UseGuards(InternalAuthGuard)
export class AdsCampaignReviewController {
  constructor(
    private readonly adsCampaignReview: AdsCampaignReviewService,
  ) {}

  @Get("queue")
  @ApiOperation({
    summary: "Internal ads campaign review queue for operations",
  })
  async getQueue() {
    return this.adsCampaignReview.queue();
  }
}
