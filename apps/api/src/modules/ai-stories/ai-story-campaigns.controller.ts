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
import { CreateStoryCampaignDto } from "./dto/create-story-campaign.dto";
import { AiStoryCampaignOrchestrationService } from "./ai-story-campaign-orchestration.service";

@ApiTags("ai-story-campaigns")
@Controller({
  path: "ai-stories/campaigns",
  version: "1",
})
@UseGuards(InternalAuthGuard)
export class AiStoryCampaignsController {
  constructor(
    private readonly aiStoryCampaigns: AiStoryCampaignOrchestrationService,
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary:
      "Internal AI Stories campaign orchestration with intelligence risk and wallet budget hold",
  })
  async createCampaign(
    @Body() body: CreateStoryCampaignDto,
    @Headers("x-request-id") requestId?: string,
  ) {
    return this.aiStoryCampaigns.createCampaign(body, requestId);
  }
}
