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
import { AdsCampaignLifecycleService } from "./ads-campaign-lifecycle.service";
import { RegisterCampaignSpendDto } from "./dto/register-campaign-spend.dto";
import { UpdateCampaignStatusDto } from "./dto/update-campaign-status.dto";

@ApiTags("ads-campaign-lifecycle")
@Controller({
  path: "ads/campaigns",
  version: "1",
})
@UseGuards(InternalAuthGuard)
export class AdsCampaignLifecycleController {
  constructor(
    private readonly adsCampaignLifecycle: AdsCampaignLifecycleService,
  ) {}

  @Post("status")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "Internal ads campaign lifecycle transition",
  })
  async updateStatus(
    @Body() body: UpdateCampaignStatusDto,
    @Headers("x-request-id") requestId?: string,
  ) {
    return this.adsCampaignLifecycle.updateStatus(body, requestId);
  }

  @Post("spend")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "Internal ads campaign spend registration",
  })
  async registerSpend(
    @Body() body: RegisterCampaignSpendDto,
    @Headers("x-request-id") requestId?: string,
  ) {
    return this.adsCampaignLifecycle.registerSpend(body, requestId);
  }
}
