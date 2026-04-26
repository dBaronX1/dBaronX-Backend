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
import { AiStoryCampaignLifecycleService } from "./ai-story-campaign-lifecycle.service";
import { UpdateStoryCampaignStatusDto } from "./dto/update-story-campaign-status.dto";

@ApiTags("ai-story-campaign-lifecycle")
@Controller({
  path: "ai-stories/campaigns",
  version: "1",
})
@UseGuards(InternalAuthGuard)
export class AiStoryCampaignLifecycleController {
  constructor(
    private readonly aiStoryCampaignLifecycle: AiStoryCampaignLifecycleService,
  ) {}

  @Post("status")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "Internal AI Stories campaign lifecycle transition",
  })
  async updateStatus(
    @Body() body: UpdateStoryCampaignStatusDto,
    @Headers("x-request-id") requestId?: string,
  ) {
    return this.aiStoryCampaignLifecycle.updateStatus(body, requestId);
  }
}
