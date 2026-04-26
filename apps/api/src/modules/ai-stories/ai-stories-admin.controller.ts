import { Controller, Get, UseGuards } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { InternalAuthGuard } from "../../shared/guards/internal-auth.guard";
import { AiStoriesAdminService } from "./ai-stories-admin.service";

@ApiTags("ai-stories-admin")
@Controller({
  path: "ai-stories/admin",
  version: "1",
})
@UseGuards(InternalAuthGuard)
export class AiStoriesAdminController {
  constructor(private readonly aiStoriesAdmin: AiStoriesAdminService) {}

  @Get("dashboard")
  @ApiOperation({
    summary: "Internal AI Stories operations dashboard",
  })
  async getDashboard() {
    return this.aiStoriesAdmin.dashboard();
  }
}
