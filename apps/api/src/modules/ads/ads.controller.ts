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
import { CreateCampaignDto } from "./dto/create-campaign.dto";
import { AdsCampaignOrchestrationService } from "./ads-campaign-orchestration.service";

@ApiTags("ads")
@Controller({
  path: "ads/campaigns",
  version: "1",
})
@UseGuards(InternalAuthGuard)
export class AdsController {
  constructor(
    private readonly adsCampaignOrchestration: AdsCampaignOrchestrationService,
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: "Internal ads campaign orchestration with wallet budget hold",
  })
  async createCampaign(
    @Body() body: CreateCampaignDto,
    @Headers("x-request-id") requestId?: string,
  ) {
    return this.adsCampaignOrchestration.createCampaign(body, requestId);
  }
}
