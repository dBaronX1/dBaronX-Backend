import { Controller, Get, Param, UseGuards } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { InternalAuthGuard } from "../../shared/guards/internal-auth.guard";
import { AiStoryDistributionPackService } from "./ai-story-distribution-pack.service";

@ApiTags("ai-story-distribution-pack")
@Controller({
  path: "ai-stories/distribution-pack",
  version: "1",
})
@UseGuards(InternalAuthGuard)
export class AiStoryDistributionPackController {
  constructor(
    private readonly aiStoryDistributionPack: AiStoryDistributionPackService,
  ) {}

  @Get(":campaignId")
  @ApiOperation({
    summary:
      "Internal AI Stories distribution pack for scheduling, publishing, and frontend consumption",
  })
  async getPack(@Param("campaignId") campaignId: string) {
    return this.aiStoryDistributionPack.build(campaignId);
  }
}
