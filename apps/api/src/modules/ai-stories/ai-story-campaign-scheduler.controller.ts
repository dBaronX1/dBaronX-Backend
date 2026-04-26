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
import { ScheduleStoryCampaignDto } from "./dto/schedule-story-campaign.dto";
import { AiStoryCampaignSchedulerService } from "./ai-story-campaign-scheduler.service";

@ApiTags("ai-story-campaign-scheduler")
@Controller({
  path: "ai-stories/campaigns",
  version: "1",
})
@UseGuards(InternalAuthGuard)
export class AiStoryCampaignSchedulerController {
  constructor(
    private readonly aiStoryCampaignScheduler: AiStoryCampaignSchedulerService,
  ) {}

  @Post("schedule")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "Internal AI Stories campaign scheduling",
  })
  async schedule(
    @Body() body: ScheduleStoryCampaignDto,
    @Headers("x-request-id") requestId?: string,
  ) {
    return this.aiStoryCampaignScheduler.schedule(body, requestId);
  }
}
